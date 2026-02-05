// === Twitter Scroll Collector ===
// Paste this in the DevTools console on x.com/BishPlsOk

(function() {
  const batches = [];
  let tweetCount = 0;

  // Intercept XHR responses
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__url = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    if (this.__url && this.__url.includes('UserTweets')) {
      this.addEventListener('load', function() {
        try {
          const json = JSON.parse(this.responseText);
          batches.push(json);
          const insts = json?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];
          let c = 0;
          for (const inst of insts) {
            for (const e of (inst.entries || [])) {
              if (e.entryId?.startsWith('tweet-') || e.entryId?.startsWith('profile-conversation-')) c++;
            }
          }
          tweetCount += c;
          console.log('Batch ' + batches.length + ': +' + c + ' = ' + tweetCount + ' total tweets');
        } catch(e) {}
      });
    }
    return origSend.apply(this, arguments);
  };

  // Auto-scroll function
  let scrolling = true;

  async function autoScroll() {
    let lastH = 0, stale = 0;
    while (scrolling) {
      window.scrollBy(0, 600);
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 1500));
      const h = document.body.scrollHeight;
      document.title = 'Collecting: ' + tweetCount + ' tweets (' + batches.length + ' batches)';
      if (h === lastH) {
        stale++;
        if (stale > 5) window.scrollTo(0, h);
        if (stale > 20) { scrolling = false; break; }
      } else {
        stale = 0;
      }
      lastH = h;
    }
    document.title = 'DONE: ' + tweetCount + ' tweets (' + batches.length + ' batches)';
    console.log('Collection complete! Call downloadBatches() to save.');
  }

  // Download function
  window.downloadBatches = function() {
    const blob = new Blob([JSON.stringify(batches)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw-batches-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Downloaded ' + batches.length + ' batches (' + tweetCount + ' tweets)');
  };

  window.stopScrolling = function() { scrolling = false; };
  window.getStatus = function() {
    return { batches: batches.length, tweets: tweetCount, scrolling };
  };

  console.log('Collector installed! Auto-scrolling started...');
  console.log('Commands: getStatus(), stopScrolling(), downloadBatches()');
  autoScroll();
})();