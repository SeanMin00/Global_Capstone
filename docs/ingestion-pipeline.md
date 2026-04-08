# Scheduled Ingestion Pipeline

## Easiest MVP Strategy

Use **GNews** as the article source and calculate sentiment inside your own backend.

Why this is the easiest practical choice:

- broad international coverage
- country and language filters
- straightforward REST API
- enough for scheduled ingestion without building a scraper
- lets you own the sentiment and fear scoring logic

## Recommended Pipeline

1. Render Cron runs every 15 minutes.
2. Cron executes `python -m app.jobs.ingest_news`.
3. Job calls GNews for target regions or countries.
4. Normalize and deduplicate articles by URL.
5. Score each article.
6. Cluster similar stories into `news_events`.
7. Recompute `region_sentiment_daily`.
8. Frontend reads aggregated tables through the FastAPI app.

## Near Real-Time vs Scheduled

For MVP, scheduled is enough.

- Start with every 15 minutes.
- If cost or rate limits are tight, switch to every 30 or 60 minutes.
- If the demo needs a stronger "live" feel, poll the frontend every 60 seconds against already-aggregated API results.

## Region-Level Sentiment Formula

For each article:

- score headline sentiment from `-1` to `1`
- score summary sentiment from `-1` to `1`
- optionally add body sentiment if available

Recommended MVP formula:

```text
article_sentiment = 0.6 * headline_sentiment + 0.4 * summary_sentiment
region_sentiment = average(article_sentiment across region and day)
```

Optional quality weighting later:

- source credibility weight
- article freshness decay
- market relevance weight

## Fear Score Formula

Keep this simple and interpretable.

```text
negative_share = percent of articles with sentiment < -0.2
risk_keyword_rate = percent of articles containing crisis / war / inflation / layoffs / default / selloff style terms
event_intensity = normalized event cluster intensity

fear_score = 100 * (
  0.5 * negative_share +
  0.3 * risk_keyword_rate +
  0.2 * event_intensity
)
```

Clamp to `0-100`.

Interpretation:

- `0-25`: calm
- `26-50`: cautious
- `51-75`: risk-off
- `76-100`: stress spike

## MVP Signal Score

You can expose one more number to the UI:

```text
signal_score = (region_sentiment * 40) - (fear_score * 0.3) + momentum_score
```

This is not an investing recommendation. It is just a compact UI metric.

## Tooling Recommendation

- Source: GNews
- HTTP client: `httpx`
- Scheduler: Render Cron
- Storage: Supabase Postgres
- First sentiment implementation: keyword + lexicon or OpenAI batch classification later

## Easy Upgrade Path

- Add article embeddings for clustering
- Add source weighting
- Add market ticker extraction
- Add country-to-region mapping table
- Add intraday aggregation table

