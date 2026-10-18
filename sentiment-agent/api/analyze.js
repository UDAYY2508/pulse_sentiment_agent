import { tweets, askGemini, sendJson, corsHeaders } from './_lib/agent.js';

export default async function handler(req, res) {
  if (corsHeaders(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    const compactTweets = tweets.map(t => ({ id: t.id, text: t.text }));

    // Send all 100 tweets in 1 request to consume only 1 API quota point and avoid the 5 requests/min rate limit
    const prompt = `Classify each tweet's overall sentiment. Return ONLY a valid JSON array of objects with the exact schema:
[{"id":"string","sentiment":"Positive|Negative|Neutral","reason":"brief evidence-based reason"}]
Preserve every tweet ID exactly and return one classification per input tweet.
TWEETS:
${JSON.stringify(compactTweets)}`;

    let results = [];
    try {
      const text = await askGemini(prompt, 8192, true);
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        results = parsed;
      } else {
        throw new Error('Unexpected JSON structure from model');
      }
    } catch (singleErr) {
      console.warn('Single request classification fallback to sequential batches:', singleErr.message);
      // Fallback: 2 sequential batches of 50 tweets with delay to avoid rate limits
      const half1 = compactTweets.slice(0, 50);
      const half2 = compactTweets.slice(50);

      const p1 = `Classify each tweet's overall sentiment. Return ONLY a valid JSON array of objects {"id":"...","sentiment":"Positive|Negative|Neutral","reason":"brief reason"}.\nTWEETS:\n${JSON.stringify(half1)}`;
      const t1 = await askGemini(p1, 6000, true);
      const res1 = JSON.parse(t1.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

      // Small pause to respect free-tier rate limits
      await new Promise(r => setTimeout(r, 2000));

      const p2 = `Classify each tweet's overall sentiment. Return ONLY a valid JSON array of objects {"id":"...","sentiment":"Positive|Negative|Neutral","reason":"brief reason"}.\nTWEETS:\n${JSON.stringify(half2)}`;
      const t2 = await askGemini(p2, 6000, true);
      const res2 = JSON.parse(t2.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

      results = [...(Array.isArray(res1) ? res1 : []), ...(Array.isArray(res2) ? res2 : [])];
    }

    const analyzed = tweets.map(t => {
      const r = results.find(x => x.id === t.id) || {};
      return {
        ...t,
        sentiment: ['Positive', 'Negative', 'Neutral'].includes(r.sentiment) ? r.sentiment : 'Neutral',
        reason: String(r.reason || '')
      };
    });

    const counts = { Positive: 0, Negative: 0, Neutral: 0 };
    analyzed.forEach(t => counts[t.sentiment]++);

    return sendJson(res, 200, {
      total: analyzed.length,
      counts,
      percentages: Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, Number(((v / analyzed.length) * 100).toFixed(1))])
      ),
      tweets: analyzed
    });
  } catch (e) {
    console.error('Analyze endpoint error:', e.message);
    const isRateLimit = e.message && (e.message.includes('Quota exceeded') || e.message.includes('429') || e.status === 429);
    const userMessage = isRateLimit
      ? 'Google Gemini Free Tier quota reached (5 requests/min limit). Please wait ~20–30 seconds and click "Analyze all tweets" again.'
      : (e.message || 'Unexpected server error.');
    return sendJson(res, e.status || 500, { error: userMessage });
  }
}
