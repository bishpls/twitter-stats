import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connect } from '../db/connection.mjs';
import { Tweet } from '../db/models/tweet.mjs';
import { Score } from '../db/models/score.mjs';
import { ANCHORS } from '../analyze/anchors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, 'public')));

const categories = Object.keys(ANCHORS);

// Summary stats
app.get('/api/summary', async (req, res) => {
  const totalTweets = await Tweet.countDocuments();
  const oldest = await Tweet.findOne().sort({ createdAt: 1 }).lean();
  const newest = await Tweet.findOne().sort({ createdAt: -1 }).lean();

  const pipeline = await Score.aggregate([
    { $group: { _id: null, avgSentiment: { $avg: '$sentiment' } } }
  ]);
  const avgSentiment = pipeline[0]?.avgSentiment ?? 0;

  const dominantCounts = await Score.aggregate([
    { $group: { _id: '$dominant', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const topHashtags = await Tweet.aggregate([
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    totalTweets,
    dateRange: {
      from: oldest?.createdAt,
      to: newest?.createdAt
    },
    avgSentiment: Math.round(avgSentiment * 1000) / 1000,
    dominantEmotions: dominantCounts,
    topHashtags
  });
});

// Timeline: daily rolling averages
app.get('/api/timeline', async (req, res) => {
  const window = parseInt(req.query.window) || 7;

  const daily = await Score.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        avgSentiment: { $avg: '$sentiment' },
        count: { $sum: 1 },
        ...Object.fromEntries(categories.map(c => [
          `avg_${c}`, { $avg: { $ifNull: [`$rawScores.${c}`, 0] } }
        ]))
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Compute rolling averages
  const result = daily.map((day, i) => {
    const windowSlice = daily.slice(Math.max(0, i - window + 1), i + 1);
    const rollingSentiment = windowSlice.reduce((s, d) => s + d.avgSentiment, 0) / windowSlice.length;

    const rollingEmotions = {};
    for (const cat of categories) {
      rollingEmotions[cat] = windowSlice.reduce((s, d) => s + (d[`avg_${cat}`] || 0), 0) / windowSlice.length;
    }

    return {
      date: day._id,
      sentiment: Math.round(rollingSentiment * 1000) / 1000,
      count: day.count,
      ...Object.fromEntries(Object.entries(rollingEmotions).map(([k, v]) => [k, Math.round(v * 1000) / 1000]))
    };
  });

  res.json(result);
});

// Emotion averages for radar chart
app.get('/api/emotions', async (req, res) => {
  const result = {};

  for (const cat of categories) {
    const agg = await Score.aggregate([
      { $group: { _id: null, avg: { $avg: `$rawScores.${cat}` } } }
    ]);
    result[cat] = Math.round((agg[0]?.avg ?? 0) * 1000) / 1000;
  }

  res.json(result);
});

// Individual tweets (paginated, filterable)
app.get('/api/tweets', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const emotion = req.query.emotion;
  const sort = req.query.sort || 'createdAt';
  const order = req.query.order === 'asc' ? 1 : -1;

  const filter = {};
  if (emotion) filter.dominant = emotion;

  const scores = await Score.find(filter)
    .sort({ [sort]: order })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const tweetIds = scores.map(s => s.tweetId);
  const tweets = await Tweet.find({ tweetId: { $in: tweetIds } }).lean();
  const tweetMap = Object.fromEntries(tweets.map(t => [t.tweetId, t]));

  const merged = scores.map(s => ({
    tweetId: s.tweetId,
    text: tweetMap[s.tweetId]?.text,
    createdAt: s.createdAt,
    dominant: s.dominant,
    sentiment: Math.round(s.sentiment * 1000) / 1000,
    likes: tweetMap[s.tweetId]?.likes ?? 0,
    retweets: tweetMap[s.tweetId]?.retweets ?? 0,
    views: tweetMap[s.tweetId]?.views ?? 0,
    rawScores: s.rawScores
  }));

  const total = await Score.countDocuments(filter);
  res.json({ tweets: merged, total, page, limit });
});

// Scatter: sentiment vs engagement
app.get('/api/scatter', async (req, res) => {
  const scores = await Score.find({}, 'tweetId sentiment').lean();
  const tweetIds = scores.map(s => s.tweetId);
  const tweets = await Tweet.find({ tweetId: { $in: tweetIds } }, 'tweetId likes retweets views').lean();
  const tweetMap = Object.fromEntries(tweets.map(t => [t.tweetId, t]));

  const data = scores.map(s => {
    const t = tweetMap[s.tweetId];
    return {
      tweetId: s.tweetId,
      sentiment: Math.round(s.sentiment * 1000) / 1000,
      engagement: (t?.likes ?? 0) + (t?.retweets ?? 0),
      views: t?.views ?? 0
    };
  });

  res.json(data);
});

// Top tweets by emotion z-score
app.get('/api/top-by-emotion', async (req, res) => {
  const n = parseInt(req.query.n) || 3;
  const result = {};

  for (const cat of categories) {
    const top = await Score.find({})
      .sort({ [`rawScores.${cat}`]: -1 })
      .limit(n)
      .lean();

    const tweetIds = top.map(s => s.tweetId);
    const tweets = await Tweet.find({ tweetId: { $in: tweetIds } }).lean();
    const tweetMap = Object.fromEntries(tweets.map(t => [t.tweetId, t]));

    result[cat] = top.map(s => ({
      tweetId: s.tweetId,
      text: tweetMap[s.tweetId]?.text,
      createdAt: s.createdAt,
      score: Math.round((s.rawScores?.get?.(cat) ?? s.rawScores?.[cat] ?? 0) * 1000) / 1000,
      sentiment: Math.round(s.sentiment * 1000) / 1000
    }));
  }

  res.json(result);
});

export async function startServer(port = 3000) {
  await connect();
  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });
}
