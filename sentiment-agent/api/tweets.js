import { tweets, sendJson, corsHeaders } from './_lib/agent.js';

export default async function handler(req, res) {
  if (corsHeaders(req, res)) return;
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  const url = new URL(req.url, 'http://localhost');
  const q = (req.query?.q || url.searchParams.get('q') || '').toLowerCase().trim();
  const found = q
    ? tweets.filter(t => t.id.toLowerCase().includes(q) || t.text.toLowerCase().includes(q))
    : tweets;

  return sendJson(res, 200, {
    total: tweets.length,
    count: found.length,
    tweets: found
  });
}
