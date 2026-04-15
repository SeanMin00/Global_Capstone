# Global Capstone

MVP-first global market intelligence app for beginner investors.

Current stack:

- Frontend: Next.js + TypeScript + Recharts
- Backend: FastAPI + Python
- Data: Yahoo Finance (`yfinance`), GDELT, Alpha Vantage
- Database: Supabase Postgres
- Frontend deploy: Vercel
- Backend deploy: Render

## Current Project Structure

```text
.
├── backend
│   ├── .env.example
│   ├── main.py
│   ├── market_risk.py
│   ├── requirements.txt
│   └── stock_data.py
├── frontend
│   ├── .env.example
│   ├── app
│   │   ├── explore
│   │   ├── portfolio
│   │   ├── stocks
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── sentiment-world-map.tsx
│   └── package.json
└── supabase
    └── schema.sql
```

## Local Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Useful backend checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/regions/sentiment
curl "http://127.0.0.1:8000/api/quote?ticker=AAPL"
curl "http://127.0.0.1:8000/api/chart?ticker=AAPL&period=1mo&interval=1d"
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open:

- Explore: `http://localhost:3001/explore`
- Stock chart example: `http://localhost:3001/stocks/AAPL`

## Environment Variables

### Frontend

`frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend

`backend/.env`

```env
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:6543/postgres
FRONTEND_ORIGINS=http://localhost:3001,http://localhost:3002,https://your-frontend.vercel.app
FRONTEND_ORIGIN_REGEX=https://.*\\.vercel\\.app
GDELT_QUERY=(economy OR markets OR stocks OR inflation OR trade OR oil)
GDELT_MAX_RECORDS=60
INGEST_ARTICLE_LIMIT_PER_REGION=16
ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_VANTAGE_API_KEY
FRED_API_KEY=YOUR_FRED_API_KEY
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` is the main frontend-to-backend switch for local vs deployed environments.
- `FRONTEND_ORIGINS` controls FastAPI CORS and accepts a comma-separated list.
- `FRONTEND_ORIGIN_REGEX` is useful for Vercel preview URLs.

## Deployment

### Frontend on Vercel

1. Import the GitHub repo into Vercel.
2. Set **Root Directory** to `frontend`.
3. Add environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
```

4. Deploy.

### Backend on Render

1. Create a new **Web Service** from the same GitHub repo.
2. Set **Root Directory** to `backend`.
3. Build command:

```bash
pip install -r requirements.txt
```

4. Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

You can also use the root [render.yaml](/Users/gideokmin/Documents/Global%20Capstone/render.yaml) blueprint file instead of filling these manually.

5. Add environment variables:

```env
SUPABASE_DB_URL=...
FRONTEND_ORIGINS=https://your-frontend.vercel.app
FRONTEND_ORIGIN_REGEX=https://.*\\.vercel\\.app
GDELT_QUERY=(economy OR markets OR stocks OR inflation OR trade OR oil)
GDELT_MAX_RECORDS=60
INGEST_ARTICLE_LIMIT_PER_REGION=16
ALPHA_VANTAGE_API_KEY=...
FRED_API_KEY=...
```

### Recommended Order

1. Deploy backend on Render
2. Copy the Render URL
3. Set `NEXT_PUBLIC_API_BASE_URL` in Vercel
4. Deploy frontend on Vercel
5. Copy the Vercel URL back into Render as `FRONTEND_ORIGINS`
6. Redeploy backend once

## Current MVP Features

- World map with regional and country drill-down
- News-based market summaries
- Market risk snapshots
- Explorer views for country/segment/company structure
- Stock chart view using Yahoo Finance
- Portfolio CML / efficient frontier MVP
- Profile onboarding

## Developer Note

This repo currently prioritizes working MVP behavior over infrastructure complexity.

- Market data fetches are client-triggered
- No caching layer yet
- No auth yet
- No background scheduler required for frontend charting

That keeps the app easy to demo, debug, and deploy.
