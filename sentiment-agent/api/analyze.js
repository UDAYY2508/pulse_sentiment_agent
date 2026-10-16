import { tweets, askGemini, sendJson, corsHeaders } from './_lib/agent.js';

export default async function handler(req, res) {
  if (corsHeaders(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  try {
    const batches = [];
    for (let i = 0; i < tweets.length; i += 20) {
      batches.push(tweets.slice(i, i + 20));
    }

    // Parallelize batch processing to finish quickly (~3s instead of ~25s) and prevent Vercel timeouts
    const batchPromises = batches.map(async (batch) => {
      const prompt = `Classify each tweet's overall sentiment. Return ONLY a JSON array with objects {"id":"...","sentiment":"Positive|Negative|Neutral","reason":"brief evidence-based reason"}. Preserve every ID exactly and return one result per input.\nTWEETS:\n${JSON.stringify(batch)}`;
      const text = await askGemini(prompt, 5000, true);
      let parsed;
      try {
        parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/, '').trim());
      } catch {
        throw new Error('Model returned invalid JSON during batch analysis. Please retry.');
      }
      if (!Array.isArray(parsed)) throw new Error('Unexpected model response format.');
      return parsed;
    });

    const batchResults = await Promise.all(batchPromises);
    const results = batchResults.flat();

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
    return sendJson(res, e.status || 500, { error: e.message || 'Unexpected server error.' });
  }
}
