import healthHandler from './health.js';
import tweetsHandler from './tweets.js';
import chatHandler from './chat.js';
import analyzeHandler from './analyze.js';
import { sendJson, corsHeaders } from './_lib/agent.js';

export default async function handler(req, res) {
  if (corsHeaders(req, res)) return;
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/\/$/, '');

  if (pathname === '/api/health' || pathname === '/health') {
    return healthHandler(req, res);
  }
  if (pathname === '/api/tweets' || pathname === '/tweets') {
    return tweetsHandler(req, res);
  }
  if (pathname === '/api/chat' || pathname === '/chat') {
    return chatHandler(req, res);
  }
  if (pathname === '/api/analyze' || pathname === '/analyze') {
    return analyzeHandler(req, res);
  }

  return sendJson(res, 404, { error: 'Endpoint not found', path: url.pathname });
}
