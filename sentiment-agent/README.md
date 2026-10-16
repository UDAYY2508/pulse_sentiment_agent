# Pulse — Social Media Sentiment Analysis Agent

A small, dependency-free Node.js app with a browser UI, powered by the Google Gemini API. Includes the 100 synthetic tweets supplied for UC03.

## Start in 2 minutes
1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Open `.env` and set `GEMINI_API_KEY=your_real_google_gemini_key`.
4. In this folder run `npm start` (no `npm install` required).
5. Open http://localhost:3001.

**No `node_modules` are required.** The server uses only Node.js built-in modules, so it can run even if npm package downloads are unavailable. The app's API key is read by the local server and is never embedded in browser JavaScript.

## Features
- Chat assistant grounded in the supplied tweet dataset.
- Sentiment labels and explanations for individual tweets.
- Search and browse all 100 source tweets.
- Batch classification across all 100 tweets, with sentiment counts, percentages and per-tweet reasons.
- Responsive dark dashboard and API key status.

## API
- `GET /api/health` — configuration status and dataset count
- `GET /api/tweets?q=...` — search source tweets
- `POST /api/chat` — `{ "message": "...", "history": [] }`
- `POST /api/analyze` — classify all tweets (5 Gemini requests in batches of 20)

The app needs internet access at runtime for Gemini API calls. Full analysis uses five API requests and may take a minute, subject to API quotas. Treat this as an assessment prototype and verify important classifications.
