/**
 * Tiny HTTP server that receives POST data and writes to data/raw/.
 * Used to transfer collected batches from browser to filesystem.
 */
import { createServer } from 'http';
import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'data', 'raw');

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const filename = `raw-batches-${Date.now()}.json`;
      const path = join(RAW_DIR, filename);
      await writeFile(path, body);
      console.log(`Saved ${(body.length / 1024 / 1024).toFixed(1)}MB to ${filename}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, filename, bytes: body.length }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(9876, () => {
  console.log('Data receiver listening on http://localhost:9876');
  console.log('POST to /save to write JSON to data/raw/');
});
