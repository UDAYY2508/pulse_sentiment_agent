# Pulse — Social Media Sentiment Analysis Agent

A dependency-free Node.js app with a browser UI, powered by the Google Gemini API. Includes the 100 synthetic tweets supplied for UC03.

---

## 🚀 Deploying to Vercel

This repository is pre-configured for one-click deployment to [Vercel](https://vercel.com) using Vercel Serverless Functions and Edge static asset serving.

### Option 1: Via GitHub & Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Configure for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/<your-username>/pulse-sentiment-agent.git
   git push -u origin main
   ```
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New..."** → **"Project"**.
   - Select your GitHub repository.
   - (Optional) If you are deploying the root repository directly, keep Root Directory as `./`. If deploying only the `sentiment-agent` subdirectory, set the Root Directory to `sentiment-agent`.
3. **Set Environment Variables**:
   - Under **Environment Variables**, add:
     - `GEMINI_API_KEY`: Your Google Gemini API key.
     - `GEMINI_MODEL`: (Optional, defaults to `gemini-3.8-flash`).
4. **Deploy**:
   - Click **Deploy**. Your app will be live with a URL like `https://pulse-sentiment-agent.vercel.app`!

### Option 2: Via Vercel CLI

1. Run:
   ```bash
   npx vercel
   ```
2. Follow the interactive prompts.
3. Add your environment variable:
   ```bash
   npx vercel env add GEMINI_API_KEY
   ```
4. Deploy to production:
   ```bash
   npx vercel --prod
   ```

---

## 💻 Local Development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Open `.env` and set `GEMINI_API_KEY=your_real_google_gemini_key`.
4. In this folder run:
   ```bash
   npm start
   ```
   *(No `npm install` needed — built with zero external dependencies!)*
5. Open http://localhost:3001 in your browser.

---

## ⚡ Architecture & Enhancements for Vercel

- **Serverless API Handlers**: Built in `api/` (`api/health.js`, `api/tweets.js`, `api/chat.js`, `api/analyze.js`).
- **Parallel Batch Processing**: Batch analysis now executes Gemini requests in parallel via `Promise.all`, reducing total batch analysis time from ~25s down to ~3s and staying well within Vercel's serverless function timeout limits.
- **Fail-safe Data Loading**: Tweets dataset is available as both JSON and an embedded ES module in `api/_lib/tweets.js` to ensure 100% reliability in serverless environments.
- **Automatic .env Loading**: Node 20+ built-in `process.loadEnvFile()` auto-detects `.env` for local testing without third-party dependencies.

---

## API Endpoints

- `GET /api/health` — Configuration status and dataset count
- `GET /api/tweets?q=...` — Search and filter source tweets
- `POST /api/chat` — `{ "message": "...", "history": [] }`
- `POST /api/analyze` — Classifies all 100 tweets across 5 concurrent batches
