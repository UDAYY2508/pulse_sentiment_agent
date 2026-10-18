import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Embedded dataset fallback
import fallbackTweets from './tweets.js';

let loadedTweets = fallbackTweets;
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const possiblePaths = [
    path.resolve(__dirname, '../../data/tweets.json'),
    path.resolve(__dirname, '../data/tweets.json'),
    path.resolve(process.cwd(), 'data/tweets.json'),
    path.resolve(process.cwd(), 'sentiment-agent/data/tweets.json'),
    path.resolve(process.cwd(), 'public/tweets.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      loadedTweets = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }
} catch {
  loadedTweets = fallbackTweets;
}

export const tweets = loadedTweets;

export function getModel() {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
}

export const systemInstruction = `You are Pulse, a careful social-media sentiment analysis agent. Focus on the supplied tweet dataset and sentiment analysis. Classify by overall meaning, not keyword matching. Consider negation, sarcasm, context, informal language and emojis. Use exactly Positive, Negative, or Neutral as labels. Explain briefly using evidence from the text. Do not invent facts, authors, intent, or dataset details. Factual statements without a clear opinion are Neutral. If asked about a specific dataset tweet, identify its Tweet_ID. If asked for overall sentiment, report counts and percentages and state the denominator. Distinguish dataset-derived findings from inference.`;

export function rankTweets(query, limit = 18) {
  const terms = query.toLowerCase().match(/[a-z0-9@#']+/g)?.filter(t => t.length > 2) || [];
  if (!terms.length) return tweets.slice(0, limit);
  const ranked = tweets.map(t => {
    const hay = `${t.id} ${t.text}`.toLowerCase();
    return {
      ...t,
      score: terms.reduce((n, term) => n + (hay.includes(term) ? (t.id.toLowerCase() === term ? 5 : 1) : 0), 0)
    };
  }).filter(t => t.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return ranked.length ? ranked : tweets.slice(0, 12);
}

export async function askGemini(prompt, maxOutputTokens = 3500, jsonMode = false, retries = 1) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw Object.assign(
      new Error('Gemini API key is missing. Add GEMINI_API_KEY to your environment variables or .env file, then restart/redeploy.'),
      { status: 400 }
    );
  }
  const model = getModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {})
        }
      })
    }
  );
  const data = await response.json();
  if (response.status === 429 && retries > 0) {
    // If rate-limited on free tier, wait for the suggested retry window (or 6s) and retry once
    const match = data?.error?.message?.match(/retry in ([0-9.]+)s/i);
    const delayMs = match ? Math.min(Math.ceil(parseFloat(match[1])) * 1000, 10000) : 6000;
    if (delayMs <= 10000) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return askGemini(prompt, maxOutputTokens, jsonMode, retries - 1);
    }
  }
  if (!response.ok) {
    throw Object.assign(
      new Error(data?.error?.message || `Gemini API error (${response.status})`),
      { status: response.status }
    );
  }
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || 'No response generated. Please try again.';
}

export async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      throw Object.assign(new Error('Invalid JSON request.'), { status: 400 });
    }
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON request.'), { status: 400 });
  }
}

export function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

export function corsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function' && typeof res.end === 'function') {
      res.status(204).end();
    } else {
      res.writeHead(204);
      res.end();
    }
    return true;
  }
  return false;
}
