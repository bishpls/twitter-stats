# Twitter/X Sentiment & Trend Analysis

Local tool that collects posts from any X/Twitter profile, embeds them with a sentence-level transformer model, scores them against a 20-category emotion taxonomy, and visualizes the results in an interactive dashboard.

Built for [@BishPlsOk](https://x.com/BishPlsOk) but configurable for any public profile.

**Stack**: Node.js (ESM) · MongoDB · Transformers.js · Express · Chart.js

---

## What It Does

1. **Collects** tweets via browser automation (XHR/fetch interception during scroll)
2. **Parses** raw GraphQL responses into structured tweet documents with full metadata (media, quote tweets, reply context, engagement stats)
3. **Embeds** each tweet as a 384-dimensional vector using `all-MiniLM-L6-v2`
4. **Scores** tweets against 20 Plutchik-based emotion categories using cosine similarity
5. **Normalizes** scores with z-scores and percentile rankings across the corpus
6. **Visualizes** everything in a dark-themed interactive dashboard

### Dashboard Sections

- **Summary cards** — post count, date range, average sentiment, dominant emotion, top hashtag
- **Sentiment timeline** — 7/30-day rolling average line chart
- **Emotion profile** — radar chart of average emotion scores
- **Emotion trends** — multi-line chart tracking individual emotions over time
- **Engagement vs sentiment** — scatter plot
- **Top tweets by emotion** — filterable cards showing highest-scoring tweets per category
- **Dominant emotion distribution** — donut chart

---

## Prerequisites

- **Node.js** 18+
- **MongoDB** running locally (default: `mongodb://localhost:27017/twitter-stats`)
- **Chrome** with access to x.com (logged in to an account that can view the target profile)

---

## Setup

```bash
git clone https://github.com/bishpls/twitter-stats.git
cd twitter-stats
npm install
cp .env.example .env
# Edit .env if your MongoDB URI differs from the default
```

The first run of the embedding pipeline downloads the ONNX model (~80MB). Subsequent runs use the cached version.

---

## Data Collection

X's frontend makes GraphQL calls to `/i/api/graphql/.../UserTweets` returning ~20 tweets per batch. We intercept these responses in the browser during natural scrolling.

### Option A: DevTools Console Snippet

1. Open `https://x.com/YourTargetProfile` in Chrome
2. Open DevTools (F12) → Console
3. Paste the contents of `scripts/collect-snippet.js` and press Enter
4. The script auto-scrolls and captures API responses
5. When done, run `downloadBatches()` in the console to save the JSON file
6. Move the downloaded file to `data/raw/`

### Option B: Receive Server (for automated transfer)

```bash
# Terminal 1: start the data receiver
node scripts/receive-data.mjs
# Listening on http://localhost:9876

# Then use the browser collection approach (snippet or Claude-in-Chrome)
# and POST data to localhost:9876/save
```

### Option C: Claude Code + Claude-in-Chrome

If you're running this via Claude Code with the Claude-in-Chrome extension:

1. Claude navigates to the profile tab
2. Injects XHR + fetch interceptors
3. Scrolls automatically, capturing API responses
4. Transfers data via `window.name` trick (HTTPS → HTTP bridge) to the receive server
5. Ingests automatically

### Known Limitations

- **X rate limits** kick in after ~40-50 pagination requests per session
- **UserTweets endpoint depth** is capped at ~700 most recent tweets for non-premium accounts
- To access older tweets: use [X data archive export](https://help.x.com/en/managing-your-account/how-to-download-your-x-archive), X Premium API, or a third-party archive service
- X uses both `timeline_v2` and `timeline` paths in responses — the parser handles both

---

## Pipeline

### 1. Ingest raw data → MongoDB

```bash
npm run ingest
```

Reads all JSON files from `data/raw/`, auto-detects format (pre-parsed tweets, raw GraphQL batches, or single responses), and upserts to MongoDB. Safe to run repeatedly — uses `tweetId` as the unique key.

### 2. Process (embed → score → stats)

```bash
npm run process
```

Runs three steps sequentially:
1. **Embed** — generates 384-dim vectors for any un-embedded tweets using `Xenova/all-MiniLM-L6-v2`
2. **Score** — computes cosine similarity against 20 emotion anchor phrase sets
3. **Stats** — calculates z-scores and percentile rankings across the full corpus

> Exit code 134 after completion is normal — it's an ONNX runtime mutex cleanup error. All data is saved correctly before it occurs.

### 3. Launch dashboard

```bash
npm run serve
```

Opens the dashboard at `http://localhost:3000` (or set `PORT` env var).

---

## Project Structure

```
twitter-stats/
├── src/
│   ├── collect/
│   │   ├── parse-tweets.mjs      # GraphQL response → flat tweet objects
│   │   └── ingest.mjs            # Raw JSON files → MongoDB upsert
│   ├── db/
│   │   ├── connection.mjs        # Mongoose connection singleton
│   │   └── models/
│   │       ├── tweet.mjs         # Tweet schema (text, engagement, media, entities)
│   │       ├── embedding.mjs     # 384-dim vector storage
│   │       └── score.mjs         # Emotion scores, z-scores, percentiles
│   ├── embed/
│   │   ├── embedder.mjs          # Transformers.js model wrapper (singleton)
│   │   └── run-embeddings.mjs    # Batch embedding orchestrator
│   ├── analyze/
│   │   ├── anchors.mjs           # 20 Plutchik emotion categories + anchor phrases
│   │   ├── score-tweets.mjs      # Cosine similarity scoring engine
│   │   └── stats.mjs             # Z-score and percentile computation
│   ├── visualize/
│   │   ├── server.mjs            # Express API (summary, timeline, emotions, etc.)
│   │   └── public/
│   │       ├── index.html        # Dashboard shell
│   │       ├── dashboard.js      # Chart.js rendering + interactivity
│   │       └── style.css         # Dark theme styling
│   └── utils/
│       ├── cosine.mjs            # Dot product for normalized vectors
│       └── stats-helpers.mjs     # mean, stddev, zScore, percentileRank
├── scripts/
│   ├── process.mjs               # Full pipeline runner (embed → score → stats)
│   ├── serve.mjs                 # Dashboard server entry point
│   ├── collect-snippet.js        # Browser console collection script
│   └── receive-data.mjs          # HTTP server for browser → filesystem transfer
├── data/
│   └── raw/                      # Raw JSON dumps (gitignored)
├── .env.example
├── package.json
└── README.md
```

---

## Emotion Taxonomy

20 categories based on Plutchik's wheel of emotions, each with 4 anchor phrases and a valence score:

| Category | Valence | Category | Valence |
|---|---|---|---|
| Joy | +1.0 | Sadness | -1.0 |
| Trust | +1.0 | Disgust | -1.0 |
| Anticipation | +1.0 | Anger | -1.0 |
| Love | +1.0 | Fear | -1.0 |
| Optimism | +1.0 | Pessimism | -1.0 |
| Pride | +1.0 | Contempt | -1.0 |
| Humor | +0.5 | Frustration | -0.5 |
| Curiosity | +0.3 | Remorse | -0.5 |
| Awe | 0.0 | Sarcasm | -0.3 |
| Surprise | 0.0 | Analytical | 0.0 |

Each tweet gets a raw score per category (mean cosine similarity to that category's anchors), a dominant emotion (argmax), and an overall sentiment (weighted sum of similarities × valences).

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/summary` | Total tweets, date range, avg sentiment, dominant emotion, top hashtags |
| `GET /api/timeline` | Rolling average sentiment over time (supports `?window=7` or `30`) |
| `GET /api/emotions` | Average score per emotion category (radar chart data) |
| `GET /api/tweets` | Paginated tweet list with scores (supports `?sort`, `?emotion`, `?limit`) |
| `GET /api/scatter` | Sentiment vs engagement data points |
| `GET /api/top-by-emotion` | Top 3 tweets per emotion category by z-score |

---

## Adapting for Another Profile

1. Change the target URL in the browser collection step
2. The `userId` in the GraphQL endpoint will be different — it's automatically captured by the XHR interceptor
3. Everything else (parsing, embedding, scoring, dashboard) works unchanged

---

## License

MIT
