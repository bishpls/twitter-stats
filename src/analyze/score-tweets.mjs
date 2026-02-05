import { connect, disconnect } from '../db/connection.mjs';
import { Tweet } from '../db/models/tweet.mjs';
import { Embedding } from '../db/models/embedding.mjs';
import { Score } from '../db/models/score.mjs';
import { ANCHORS } from './anchors.mjs';
import { cosine } from '../utils/cosine.mjs';

/**
 * Load all anchor embeddings grouped by category.
 */
async function loadAnchorVectors() {
  const anchorMap = {};
  for (const category of Object.keys(ANCHORS)) {
    anchorMap[category] = [];
  }

  const docs = await Embedding.find({ tweetId: /^anchor:/ }).lean();
  for (const doc of docs) {
    // tweetId format: "anchor:category:index"
    const parts = doc.tweetId.split(':');
    const category = parts[1];
    if (anchorMap[category]) {
      anchorMap[category].push(doc.vector);
    }
  }
  return anchorMap;
}

export async function scoreTweets() {
  await connect();

  const anchorVectors = await loadAnchorVectors();
  const categories = Object.keys(ANCHORS);

  const total = await Tweet.countDocuments({ scored: false, embedded: true });
  console.log(`Scoring ${total} unscored tweets...`);

  const BATCH = 200;
  let processed = 0;

  while (true) {
    const batch = await Tweet.find({ scored: false, embedded: true }).limit(BATCH).lean();
    if (!batch.length) break;

    const tweetIds = batch.map(t => t.tweetId);
    const embeddings = await Embedding.find({ tweetId: { $in: tweetIds } }).lean();
    const embedMap = Object.fromEntries(embeddings.map(e => [e.tweetId, e.vector]));

    const scoreDocs = [];

    for (const tweet of batch) {
      const vec = embedMap[tweet.tweetId];
      if (!vec) continue;

      const rawScores = {};
      let sentimentSum = 0;

      for (const cat of categories) {
        const anchors = anchorVectors[cat];
        if (!anchors.length) continue;

        const sims = anchors.map(a => cosine(vec, a));
        const avg = sims.reduce((s, v) => s + v, 0) / sims.length;
        rawScores[cat] = avg;
        sentimentSum += avg * ANCHORS[cat].valence;
      }

      const dominant = categories.reduce((best, cat) =>
        (rawScores[cat] ?? 0) > (rawScores[best] ?? 0) ? cat : best
      , categories[0]);

      const sentiment = sentimentSum / categories.length;

      scoreDocs.push({
        tweetId: tweet.tweetId,
        createdAt: tweet.createdAt,
        rawScores,
        dominant,
        sentiment,
        zScores: {},
        percentiles: {}
      });
    }

    for (const doc of scoreDocs) {
      await Score.updateOne(
        { tweetId: doc.tweetId },
        { $set: doc },
        { upsert: true }
      );
    }

    await Tweet.updateMany(
      { tweetId: { $in: tweetIds } },
      { $set: { scored: true } }
    );

    processed += batch.length;
    process.stdout.write(`\r  Scored ${processed}/${total}`);
  }

  console.log(`\nDone scoring tweets.`);
  await disconnect();
}
