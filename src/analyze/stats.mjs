import { connect, disconnect } from '../db/connection.mjs';
import { Score } from '../db/models/score.mjs';
import { ANCHORS } from './anchors.mjs';
import { mean, stddev, zScore, percentileRank } from '../utils/stats-helpers.mjs';

export async function computeStats() {
  await connect();

  const categories = Object.keys(ANCHORS);
  const allScores = await Score.find({}).lean();
  console.log(`Computing stats for ${allScores.length} scored tweets...`);

  // Gather raw score arrays per category
  const catArrays = {};
  for (const cat of categories) catArrays[cat] = [];

  for (const s of allScores) {
    for (const cat of categories) {
      const val = s.rawScores?.get?.(cat) ?? s.rawScores?.[cat] ?? 0;
      catArrays[cat].push(val);
    }
  }

  // Compute mean & stddev per category
  const catStats = {};
  const sortedArrays = {};
  for (const cat of categories) {
    const arr = catArrays[cat];
    catStats[cat] = { mean: mean(arr), stddev: stddev(arr) };
    sortedArrays[cat] = [...arr].sort((a, b) => a - b);
  }

  // Update each score with z-scores and percentiles
  console.log('Writing z-scores and percentiles...');
  let updated = 0;

  for (const s of allScores) {
    const zScores = {};
    const percentiles = {};

    for (const cat of categories) {
      const raw = s.rawScores?.get?.(cat) ?? s.rawScores?.[cat] ?? 0;
      zScores[cat] = zScore(raw, catStats[cat].mean, catStats[cat].stddev);
      percentiles[cat] = percentileRank(raw, sortedArrays[cat]);
    }

    await Score.updateOne(
      { _id: s._id },
      { $set: { zScores, percentiles } }
    );

    updated++;
    if (updated % 500 === 0) process.stdout.write(`\r  Updated ${updated}/${allScores.length}`);
  }

  console.log(`\nDone. Updated ${updated} scores with z-scores and percentiles.`);
  await disconnect();
}
