const EMOTION_COLORS = {
  joy: '#facc15', trust: '#22c55e', fear: '#a855f7', surprise: '#f97316',
  sadness: '#3b82f6', disgust: '#84cc16', anger: '#ef4444', anticipation: '#06b6d4',
  love: '#ec4899', optimism: '#10b981', pessimism: '#6b7280', contempt: '#9333ea',
  awe: '#f59e0b', remorse: '#64748b', sarcasm: '#e879f9', analytical: '#94a3b8',
  humor: '#fbbf24', frustration: '#dc2626', pride: '#14b8a6', curiosity: '#8b5cf6'
};

const CHART_DEFAULTS = {
  color: '#8b8fa3',
  borderColor: '#2a2d3a',
  backgroundColor: '#1a1d27'
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;

let timelineData = [];
let timelineChart, radarChart, emotionTimelineChart, scatterChart, distributionChart;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// ─── Summary Cards ───
async function loadSummary() {
  const data = await fetchJSON('/api/summary');
  const from = new Date(data.dateRange.from).toLocaleDateString();
  const to = new Date(data.dateRange.to).toLocaleDateString();
  const sentClass = data.avgSentiment > 0 ? 'positive' : data.avgSentiment < 0 ? 'negative' : 'neutral';
  const topEmotion = data.dominantEmotions[0]?._id ?? 'N/A';

  document.getElementById('summary-cards').innerHTML = `
    <div class="card">
      <div class="card-label">Total Posts</div>
      <div class="card-value">${data.totalTweets.toLocaleString()}</div>
    </div>
    <div class="card">
      <div class="card-label">Date Range</div>
      <div class="card-value" style="font-size:1rem">${from} — ${to}</div>
    </div>
    <div class="card">
      <div class="card-label">Avg Sentiment</div>
      <div class="card-value ${sentClass}">${data.avgSentiment > 0 ? '+' : ''}${data.avgSentiment}</div>
    </div>
    <div class="card">
      <div class="card-label">Dominant Emotion</div>
      <div class="card-value" style="color:${EMOTION_COLORS[topEmotion] || '#e4e6eb'}">${topEmotion}</div>
    </div>
    <div class="card">
      <div class="card-label">Top Hashtag</div>
      <div class="card-value" style="font-size:1rem">#${data.topHashtags[0]?._id ?? 'N/A'}</div>
    </div>
  `;
}

// ─── Sentiment Timeline ───
async function loadTimeline(window = 7) {
  timelineData = await fetchJSON(`/api/timeline?window=${window}`);

  const labels = timelineData.map(d => d.date);
  const sentiments = timelineData.map(d => d.sentiment);

  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(document.getElementById('timeline-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Sentiment',
        data: sentiments,
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { title: { display: true, text: 'Sentiment' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

document.getElementById('timeline-window').addEventListener('change', e => {
  loadTimeline(parseInt(e.target.value));
});

// ─── Radar Chart ───
async function loadRadar() {
  const data = await fetchJSON('/api/emotions');
  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = labels.map(l => EMOTION_COLORS[l] || '#6c63ff');

  if (radarChart) radarChart.destroy();
  radarChart = new Chart(document.getElementById('radar-chart'), {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Score',
        data: values,
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,0.2)',
        pointBackgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          ticks: { display: false },
          grid: { color: '#2a2d3a' },
          angleLines: { color: '#2a2d3a' },
          pointLabels: { font: { size: 10 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });

  // Populate emotion selectors
  const emotionSelect = document.getElementById('emotion-select');
  const topEmotionFilter = document.getElementById('top-emotion-filter');

  // Sort by score descending for the selects
  const sorted = labels.slice().sort((a, b) => data[b] - data[a]);
  for (const cat of sorted) {
    emotionSelect.innerHTML += `<option value="${cat}" ${['joy', 'anger', 'sadness', 'humor'].includes(cat) ? 'selected' : ''}>${cat}</option>`;
    topEmotionFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
  }
}

// ─── Emotion Timeline ───
async function loadEmotionTimeline() {
  if (!timelineData.length) return;

  const selected = Array.from(document.getElementById('emotion-select').selectedOptions).map(o => o.value);
  if (!selected.length) return;

  const labels = timelineData.map(d => d.date);
  const datasets = selected.map(cat => ({
    label: cat,
    data: timelineData.map(d => d[cat] ?? 0),
    borderColor: EMOTION_COLORS[cat] || '#6c63ff',
    backgroundColor: 'transparent',
    tension: 0.3,
    pointRadius: 0
  }));

  if (emotionTimelineChart) emotionTimelineChart.destroy();
  emotionTimelineChart = new Chart(document.getElementById('emotion-timeline-chart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { title: { display: true, text: 'Score' } }
      }
    }
  });
}

document.getElementById('emotion-select').addEventListener('change', loadEmotionTimeline);

// ─── Scatter ───
async function loadScatter() {
  const data = await fetchJSON('/api/scatter');

  if (scatterChart) scatterChart.destroy();
  scatterChart = new Chart(document.getElementById('scatter-chart'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Tweets',
        data: data.map(d => ({ x: d.sentiment, y: d.engagement })),
        backgroundColor: 'rgba(108,99,255,0.4)',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Sentiment' } },
        y: { title: { display: true, text: 'Engagement (likes + RTs)' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ─── Top Tweets ───
async function loadTopTweets() {
  const data = await fetchJSON('/api/top-by-emotion?n=3');
  const filter = document.getElementById('top-emotion-filter');

  function render() {
    const cat = filter.value;
    const tweets = data[cat] || [];
    const grid = document.getElementById('top-tweets');
    grid.innerHTML = tweets.map(t => `
      <div class="tweet-card">
        <span class="emotion-tag" style="background:${EMOTION_COLORS[cat] || '#6c63ff'}">${cat} (${t.score})</span>
        <div class="tweet-text">${escapeHtml(t.text || '')}</div>
        <div class="tweet-meta">${new Date(t.createdAt).toLocaleDateString()} · Sentiment: ${t.sentiment}</div>
      </div>
    `).join('');
  }

  filter.addEventListener('change', render);
  // Initial render once the filter is populated
  setTimeout(render, 100);
}

// ─── Dominant Emotion Distribution ───
async function loadDistribution() {
  const summary = await fetchJSON('/api/summary');
  const items = summary.dominantEmotions;
  const labels = items.map(i => i._id);
  const counts = items.map(i => i.count);
  const colors = labels.map(l => EMOTION_COLORS[l] || '#6c63ff');

  if (distributionChart) distributionChart.destroy();
  distributionChart = new Chart(document.getElementById('distribution-chart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Init ───
(async () => {
  await Promise.all([
    loadSummary(),
    loadTimeline(7),
    loadRadar(),
    loadScatter(),
    loadTopTweets(),
    loadDistribution()
  ]);
  loadEmotionTimeline();
})();
