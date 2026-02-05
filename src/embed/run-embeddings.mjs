import { connect, disconnect } from '../db/connection.mjs';
import { Tweet } from '../db/models/tweet.mjs';
import { Embedding } from '../db/models/embedding.mjs';
import { embed } from './embedder.mjs';
import { ANCHORS } from '../analyze/anchors.mjs';

const BATCH_SIZE = 32;

export async function embedAnchors() {
  console.log('Embedding anchor phrases...');
  const phrases = [];
  const keys = [];
  for (const [category, { phrases: p }] of Object.entries(ANCHORS)) {
    for (const phrase of p) {
      phrases.push(phrase);
      keys.push({ category, phrase });
    }
  }

  const existing = await Embedding.countDocuments({ tweetId: /^anchor:/ });
  if (existing >= phrases.length) {
    console.log(`  Anchors already embedded (${existing} docs). Skipping.`);
    return;
  }

  const vectors = await embed(phrases);
  for (let i = 0; i < phrases.length; i++) {
    const id = `anchor:${keys[i].category}:${i}`;
    await Embedding.updateOne(
      { tweetId: id },
      { $set: { tweetId: id, vector: vectors[i], model: 'all-MiniLM-L6-v2' } },
      { upsert: true }
    );
  }
  console.log(`  Embedded ${phrases.length} anchor phrases.`);
}

export async function embedTweets() {
  const total = await Tweet.countDocuments({ embedded: false });
  console.log(`Embedding ${total} un-embedded tweets...`);

  let processed = 0;
  while (true) {
    const batch = await Tweet.find({ embedded: false }).limit(BATCH_SIZE).lean();
    if (!batch.length) break;

    const texts = batch.map(t => t.text || '');
    const vectors = await embed(texts);

    for (let i = 0; i < batch.length; i++) {
      await Embedding.updateOne(
        { tweetId: batch[i].tweetId },
        { $set: { tweetId: batch[i].tweetId, vector: vectors[i], model: 'all-MiniLM-L6-v2' } },
        { upsert: true }
      );
      await Tweet.updateOne({ _id: batch[i]._id }, { $set: { embedded: true } });
    }

    processed += batch.length;
    process.stdout.write(`\r  Embedded ${processed}/${total}`);
  }
  console.log(`\nDone embedding tweets.`);
}

export async function runEmbeddings() {
  await connect();
  await embedAnchors();
  await embedTweets();
  await disconnect();
}
