# Global Market Intelligence MVP

MVP-first monorepo for an AI-powered global market intelligence platform aimed at beginner investors.

## Stack

- Frontend: Next.js + TypeScript + Tailwind
- Backend: FastAPI
- Database: Supabase Postgres
- Frontend deploy: Vercel
- Backend deploy: Render
- Map: Mapbox
- Heatmap / treemap: ECharts
- AI chat: OpenAI Responses API with tool calling
- News ingestion: GNews for global coverage, app-level sentiment aggregation

## Current Demo Path

Right now the actively used local demo runs on:

- Backend: [`backend/main.py`](/Users/gideokmin/Documents/Global%20Capstone/backend/main.py)
- Frontend: [`frontend/app/explore/page.tsx`](/Users/gideokmin/Documents/Global%20Capstone/frontend/app/explore/page.tsx)

This lightweight path is where the current map, bubble chart, and news flow are being iterated fastest.

## Monorepo Structure

```text
.
├── apps
│   ├── api
│   │   ├── app
│   │   │   ├── api
│   │   │   ├── core
│   │   │   ├── db
│   │   │   ├── jobs
│   │   │   ├── models
│   │   │   └── services
│   │   ├── .env.example
│   │   └── requirements.txt
│   └── web
│       ├── src
│       │   ├── app
│       │   ├── components
│       │   └── lib
│       └── .env.example
├── docs
│   ├── api-design.md
│   ├── build-plan.md
│   ├── deployment.md
│   └── ingestion-pipeline.md
└── supabase
    └── schema.sql
```

## Why This Structure

- `apps/web` stays focused on UI, routing, and client integrations.
- `apps/api` owns ingestion, aggregation, chat orchestration, and data access.
- `supabase/schema.sql` gives you one practical source of truth for the MVP database.
- `docs/` holds rollout, deployment, and architecture notes so the code stays clean.

## Local Setup

### Current Supabase-backed demo setup

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then in another terminal:

```bash
curl -X POST http://127.0.0.1:8000/setup-db
curl -X POST http://127.0.0.1:8000/ingest
curl -X POST http://127.0.0.1:8000/api/market-risk/refresh
```

`/api/market-risk/refresh` requires `ALPHA_VANTAGE_API_KEY` in `backend/.env`.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3001/explore` or `http://localhost:3002/explore` depending on your current dev port.

### 1. Clone the repo

```bash
git clone https://github.com/SeanMin00/Global_Capstone.git
cd Global_Capstone
```

### 2. Frontend setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web
```

Frontend runs at `http://localhost:3000`.

### 3. Backend setup

```bash
python3 -m venv apps/api/.venv
source apps/api/.venv/bin/activate
pip install -r apps/api/requirements.txt
cp apps/api/.env.example apps/api/.env
cd apps/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`.

## Scaffold Commands From Scratch

If you ever want to recreate the project manually instead of using this scaffold:

```bash
pnpm dlx create-next-app@latest apps/web --ts --tailwind --app --src-dir --import-alias "@/*"
python3 -m venv apps/api/.venv
source apps/api/.venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic-settings psycopg[binary] httpx openai
```

## MVP API Endpoints

- `GET /health`
- `GET /regions/sentiment`
- `GET /regions/{region}`
- `GET /articles`
- `GET /heatmap`
- `POST /chat`

More detail: [docs/api-design.md](/Users/gideokmin/Documents/Global%20Capstone/docs/api-design.md)

## MVP Build Order

1. Supabase schema and local API.
2. Explore map with mock data.
3. Heatmap view.
4. News ingestion job and daily rollups.
5. AI chat over region snapshots.
6. Dashboard and onboarding.
7. Deploy frontend and backend.

Detailed plan: [docs/build-plan.md](/Users/gideokmin/Documents/Global%20Capstone/docs/build-plan.md)

## Environment Variables

Frontend example: [apps/web/.env.example](/Users/gideokmin/Documents/Global%20Capstone/apps/web/.env.example)

Backend example: [apps/api/.env.example](/Users/gideokmin/Documents/Global%20Capstone/apps/api/.env.example)

## Deployment

Step-by-step notes for Vercel and Render: [docs/deployment.md](/Users/gideokmin/Documents/Global%20Capstone/docs/deployment.md)

## Database

Supabase SQL schema: [supabase/schema.sql](/Users/gideokmin/Documents/Global%20Capstone/supabase/schema.sql)

## Ingestion Design

Scheduled ingestion and aggregation notes: [docs/ingestion-pipeline.md](/Users/gideokmin/Documents/Global%20Capstone/docs/ingestion-pipeline.md)
