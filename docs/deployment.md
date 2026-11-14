# 🚀 Relay Deployment Guide

### 🌐 Live Production Deployment
- **Frontend App (Vercel):** [https://client-cxv9.vercel.app/](https://client-cxv9.vercel.app/)
- **Backend API (Render):** [https://relay-ygyb.onrender.com](https://relay-ygyb.onrender.com)
- **API Health Check:** [https://client-cxv9.vercel.app/api/health](https://client-cxv9.vercel.app/api/health)
- **Database:** Live MongoDB Atlas Cluster

---

## ⚡ Deployment Readiness Summary

| Component | Status | Verification Details |
|---|---|---|
| **Frontend Production Build** | ✅ Ready | `client/dist` (302 kB JS gzip 82 kB, 48 kB CSS gzip 7.9 kB) |
| **Backend REST API** | ✅ Ready | Express 4.21, Helmet, JWT Demo Auth, rate-limiter, Zod validation |
| **Evaluation Harness** | ✅ 7/7 Passed | Citation validity 100%, 0 permission leaks, conflicts/gaps resolved |
| **Vitest Test Suite** | ✅ 17/17 Passed | Parser tests, quote normalization, ACL boundary tests |
| **Database Resilience** | ✅ Fail-safe | Connects to MongoDB Atlas; automatically falls back to embedded in-memory MongoDB if unconfigured |
| **AI Resilience** | ✅ Circuit-Breaker | Gemini 3.8 / 2.5 Flash with automatic fallback to deterministic rule-based extractor on timeout or 429 quota |
| **Auto-Seed on Launch** | ✅ Active | Automatically populates "Campus Event Portal" demo dataset upon first boot |

---

## 🌐 Option 1: Render (Recommended - Single Service)

Relay includes a native `render.yaml` specification for immediate 1-click deployment.

### Steps:
1. Push your repository to GitHub or GitLab.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** $\to$ **Web Service**.
4. Connect your repository.
5. Set the following build configuration:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (Render will inject its own port dynamically)
   - `JWT_SECRET`: `relay-super-secret-jwt-key-hackathon-2026` (or any random string)
   - `MONGODB_URI`: Your MongoDB Atlas URI (or leave blank to use the embedded memory engine)
   - `GEMINI_API_KEY`: Your Google Gemini API Key (optional; deterministic fallback activates automatically if blank)
   - `GEMINI_MODEL`: `gemini-3.8-flash`
7. Click **Create Web Service**.
8. Once built, open the provided `onrender.com` URL. The demo case is immediately loaded and ready to inspect!

---

## 🚂 Option 2: Railway

1. Sign in to [Railway.app](https://railway.app).
2. Click **New Project** $\to$ **Deploy from GitHub repo**.
3. Railway automatically detects the root `package.json`:
   - Build command: `npm run build`
   - Start command: `npm start`
4. Add environment variables in the **Variables** tab (`NODE_ENV=production`, `JWT_SECRET=...`).
5. In **Settings** $\to$ **Networking**, click **Generate Domain**.

---

## 🐳 Option 3: Docker / Container Deployment

Relay includes a multi-stage `Dockerfile` and `docker-compose.yml`.

### Local or Cloud Container:
```bash
# Build and run container
docker compose up --build
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🔑 Environment Variables Reference

| Variable | Required? | Default / Fallback | Description |
|---|---|---|---|
| `PORT` | Optional | `5000` | Port for the unified server |
| `NODE_ENV` | Optional | `development` (`production` in deployed environments) | Serves static frontend when `production` |
| `JWT_SECRET` | Optional | `relay-super-secret-jwt-key-hackathon-2026` | Secret used to sign demo user tokens |
| `MONGODB_URI` | Optional | In-memory MongoDB | MongoDB Atlas connection string. If omitted or `<db_username>` placeholder detected, memory server engages automatically. |
| `GEMINI_API_KEY` | Optional | Rule-based fallback | Google AI Gemini API key |
| `GEMINI_MODEL` | Optional | `gemini-3.8-flash` | Gemini model name |
