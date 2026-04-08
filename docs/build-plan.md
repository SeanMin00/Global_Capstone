# 7-Day MVP Build Plan

## Day 1

- Finalize scope and monorepo
- Set up Next.js and FastAPI locally
- Create Supabase project
- Apply SQL schema

## Day 2

- Build `/health`
- Build `/regions/sentiment`
- Build `/regions/{region}`
- Build map page with mock data and API fallback

## Day 3

- Build `/heatmap`
- Build ECharts treemap page
- Add region detail page

## Day 4

- Build ingestion script skeleton
- Connect GNews
- Store articles in Supabase
- Add first daily aggregation query

## Day 5

- Build `/chat`
- Add OpenAI tool calling for region snapshots
- Save chat logs

## Day 6

- Build onboarding and dashboard
- Add watchlists and user preferences
- Improve empty states and loading states

## Day 7

- Deploy backend to Render
- Deploy frontend to Vercel
- Run demo flow end to end
- Polish capstone presentation narrative

## Recommended Feature Order

1. Database schema
2. Backend health and region sentiment
3. Explore map page
4. Region detail page
5. Heatmap page
6. Ingestion pipeline
7. AI chat
8. Dashboard and onboarding
9. Deployment

## Minimum Demo Scope

If time gets tight, this is enough for a strong capstone demo:

- Landing page
- Explore map with 4 regions
- One region detail page
- Heatmap with mock but believable market segments
- AI chat with region snapshot tool
- Scheduled ingestion design shown in architecture slide

## Practical Demo Story

1. Open landing page and explain the problem.
2. Go to explore map and compare regions.
3. Open a region detail page and show events plus articles.
4. Open heatmap and show sector concentration.
5. Ask the AI assistant what a beginner should watch.
6. End on the dashboard and explain how personalization fits next.

