import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// Automatically load .env file if available in Node 20.6+
try {
  process.loadEnvFile?.();
} catch {}

import healthHandler from '../api/health.js';
import tweetsHandler from '../api/tweets.js';
import chatHandler from '../api/chat.js';
import analyzeHandler from '../api/analyze.js';
import { tweets, getModel } from '../api/_lib/agent.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const PORT = Number(process.env.PORT || 3001);
const MODEL = getModel();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/$/, '');

  if (pathname === '/api/health') return healthHandler(req, res);
  if (pathname === '/api/tweets') return tweetsHandler(req, res);
  if (pathname === '/api/chat') return chatHandler(req, res);
  if (pathname === '/api/analyze') return analyzeHandler(req, res);

  // Serve static files from public/
  let requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(publicDir, '.' + requestPath);

  if (!file.startsWith(publicDir + path.sep) && file !== publicDir) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Forbidden' }));
  }

  fs.readFile(file, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Pulse running at http://localhost:${PORT} · ${tweets.length} tweets · model ${MODEL}`);
});

export default server;
