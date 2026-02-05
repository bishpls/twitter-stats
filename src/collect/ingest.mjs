import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { connect, disconnect } from '../db/connection.mjs';
import { Tweet } from '../db/models/tweet.mjs';
import { parseResponse } from './parse-tweets.mjs';

const RAW_DIR = new URL('../../data/raw/', import.meta.url).pathname;

/**
 * Detect whether a JSON file contains raw GraphQL responses or pre-parsed tweets.
 * Pre-parsed: array of objects with tweetId field
 * Raw GraphQL: object with data.user.result...
 * Raw batch array: array of objects with data.user.result...
 */
function extractTweets(raw) {
  // Pre-parsed tweet array (legacy format, fewer fields)
  if (Array.isArray(raw) && raw.length > 0 && raw[0].tweetId) {
    return raw.map(t => {
      const username = t.username || 'BishPlsOk';
      return {
        ...t,
        createdAt: new Date(t.createdAt),
        username,
        permalink: t.permalink || `https://x.com/${username}/status/${t.tweetId}`
      };
    });
  }

  // Array of raw GraphQL responses (batch file)
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.data?.user) {
    const tweets = [];
    for (const response of raw) {
      tweets.push(...parseResponse(response));
    }
    return tweets;
  }

  // Single raw GraphQL response
  if (raw?.data?.user) {
    return parseResponse(raw);
  }

  console.warn('  Unknown file format, skipping');
  return [];
}

async function ingest() {
  await connect();

  const files = (await readdir(RAW_DIR)).filter(f => f.endsWith('.json')).sort();
  console.log(`Found ${files.length} raw JSON files`);

  let total = 0;
  let upserted = 0;

  for (const file of files) {
    const raw = JSON.parse(await readFile(join(RAW_DIR, file), 'utf-8'));
    const tweets = extractTweets(raw);
    total += tweets.length;

    for (const tweet of tweets) {
      await Tweet.updateOne(
        { tweetId: tweet.tweetId },
        { $set: tweet },
        { upsert: true }
      );
      upserted++;
    }
    process.stdout.write(`\r  ${file}: ${tweets.length} tweets (${upserted} total upserted)`);
  }

  console.log(`\nDone. Parsed ${total} tweets from ${files.length} files. Upserted ${upserted}.`);
  const count = await Tweet.countDocuments();
  console.log(`Total tweets in DB: ${count}`);

  await disconnect();
}

ingest().catch(err => { console.error(err); process.exit(1); });
