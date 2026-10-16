import { tweets, sendJson, corsHeaders, getModel } from './_lib/agent.js';

export default async function handler(req, res) {
  if (corsHeaders(req, res)) return;
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  const configured = Boolean(process.env.GEMINI_API_KEY);
  return sendJson(res, 200, {
    ok: true,
    configured,
    count: tweets.length,
    model: getModel()
  });
}
