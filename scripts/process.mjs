/**
 * Full processing pipeline: embed → score → stats
 * Run after data has been ingested.
 */
import { runEmbeddings } from '../src/embed/run-embeddings.mjs';
import { scoreTweets } from '../src/analyze/score-tweets.mjs';
import { computeStats } from '../src/analyze/stats.mjs';

async function main() {
  console.log('=== Step 1: Embeddings ===');
  await runEmbeddings();

  console.log('\n=== Step 2: Scoring ===');
  await scoreTweets();

  console.log('\n=== Step 3: Stats (z-scores, percentiles) ===');
  await computeStats();

  console.log('\n=== Pipeline complete ===');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
