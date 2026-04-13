# MVP API Design

## Principles

- Keep routes flat and obvious.
- Start with backend-owned reads for all market intelligence data.
- Let the frontend call only a small set of stable endpoints.
- Add auth protection later without changing the route shapes much.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check for Render, local dev, and deployment verification |
| GET | `/regions/sentiment` | Return region-level sentiment markers for the world map |
| GET | `/regions/{region}` | Return detail view data for a specific region |
| GET | `/articles` | Filtered article feed for a region or search term |
| GET | `/heatmap` | Return treemap / heatmap nodes for sectors and regions |
| POST | `/chat` | AI assistant endpoint with optional tool usage |
| GET | `/ingestion/plan` | Debug route for the ingestion workflow during setup |
| POST | `/api/market-risk/refresh` | Fetch market/FX data, compute country risk, and store latest scores |
| GET | `/api/market-risk` | Return the latest stored market risk scores for KR, JP, CN, TW, US |
| GET | `/api/market-risk/{countryCode}` | Return the latest stored market risk score for one country |

## Endpoint Contracts

### `GET /health`

Returns:

- service name
- environment
- database connectivity flag
- UTC timestamp

### `GET /regions/sentiment`

Returns a list of region markers containing:

- `region_code`
- `region_name`
- `latitude`
- `longitude`
- `sentiment_score`
- `fear_score`
- `momentum_score`
- `article_count`
- `top_topic`

### `GET /regions/{region}`

Returns:

- headline summary
- top topics
- featured events
- featured articles
- sentiment, fear, momentum

### `GET /articles`

Query params:

- `region`
- `limit`
- `q`

For MVP, this is enough for:

- region pages
- dashboard feed
- future search box

### `GET /heatmap`

Returns a lightweight list of nodes for ECharts.

Each node includes:

- name
- value
- region code
- sector
- sentiment score
- fear score

### `POST /chat`

Request:

```json
{
  "message": "What should a beginner investor watch in Europe?",
  "region": "europe"
}
```

Response:

```json
{
  "answer": "Europe looks cautious right now...",
  "mode": "openai",
  "region_focus": "europe",
  "cards": [],
  "used_tools": ["get_region_snapshot"]
}
```

## Extension Path Later

- Add `/auth/me`
- Add `/watchlists`
- Add `/dashboard/summary`
- Add `/ingest/run` behind internal auth
- Add `/events`
