# Deployment Guide

## Frontend to Vercel

1. Push the repo to GitHub.
2. In Vercel, import the repository.
3. Set the root directory to `apps/web`.
4. Vercel detects Next.js automatically.
5. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy.

### Local CLI alternative

```bash
cd apps/web
vercel
```

## Backend to Render

1. Push the repo to GitHub.
2. In Render, create a new Web Service from the repo.
3. Set root directory to `apps/api`.
4. Use:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `APP_ENV`
   - `CORS_ORIGINS`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_DB_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `GNEWS_API_KEY`
   - `NEWS_PROVIDER`
6. Deploy.

## Scheduled Ingestion on Render

Create a Render Cron Job:

- Root directory: `apps/api`
- Build command: `pip install -r requirements.txt`
- Start command: `python -m app.jobs.ingest_news`
- Schedule: every 15 minutes

You can also use the included [render.yaml](/Users/gideokmin/Documents/Global%20Capstone/apps/api/render.yaml) as the starting point.

## Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [supabase/schema.sql](/Users/gideokmin/Documents/Global%20Capstone/supabase/schema.sql).
4. Copy project URL, anon key, and database connection string into env vars.

## Production Connection Flow

```text
Browser -> Next.js on Vercel -> FastAPI on Render -> Supabase Postgres
                                       |
                                       -> OpenAI API
                                       -> GNews API
```

## Deployment Order

1. Supabase schema
2. Render backend
3. Verify `/health`
4. Vercel frontend
5. Set frontend API base URL to Render URL
6. Enable Render Cron

