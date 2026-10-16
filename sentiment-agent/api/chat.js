import { tweets, rankTweets, askGemini, sendJson, corsHeaders, parseBody, getModel } from './_lib/agent.js';

export default async function handler(req, res) {
  if (corsHeaders(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = await parseBody(req);
    const message = String(body.message || '').trim();
    if (!message) {
      return sendJson(res, 400, { error: 'Enter a question first.' });
    }
    const broad = /overall|all tweets|dataset|distribution|summary|summarize|percentage|breakdown/i.test(message);
    const relevant = rankTweets(message, broad ? 100 : 18);
    const context = relevant.map(t => `${t.id}: ${t.text}`).join('\n');
    const history = Array.isArray(body.history)
      ? body.history.slice(-6).map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${String(m.content || '').slice(0, 1800)}`).join('\n')
      : '';
    const prompt = `DATASET CONTEXT (${relevant.length} of ${tweets.length} tweets):\n${context}\n\nRECENT CONVERSATION:\n${history || '(none)'}\n\nUSER QUESTION:\n${message}\n\nAnswer directly. For a single tweet, give its label and concise evidence. If multiple tweets are requested, show counts and percentages with the denominator stated. Never present a retrieved subset as the full dataset.`;
    const answer = await askGemini(prompt);
    return sendJson(res, 200, {
      answer,
      matched: relevant.length,
      total: tweets.length,
      model: getModel()
    });
  } catch (e) {
    console.error('Chat endpoint error:', e.message);
    return sendJson(res, e.status || 500, { error: e.message || 'Unexpected server error.' });
  }
}
