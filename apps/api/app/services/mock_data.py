from datetime import date, datetime, timedelta, timezone


def _now() -> datetime:
    return datetime.now(timezone.utc)


REGION_SENTIMENT = [
    {
        "region_code": "north-america",
        "region_name": "North America",
        "latitude": 40.0,
        "longitude": -100.0,
        "sentiment_score": 0.24,
        "fear_score": 31.0,
        "momentum_score": 12.0,
        "article_count": 128,
        "top_topic": "Rate cuts and earnings resilience",
        "updated_at": _now(),
    },
    {
        "region_code": "europe",
        "region_name": "Europe",
        "latitude": 51.0,
        "longitude": 10.0,
        "sentiment_score": -0.08,
        "fear_score": 56.0,
        "momentum_score": -9.0,
        "article_count": 94,
        "top_topic": "Energy costs and industrial slowdown",
        "updated_at": _now(),
    },
    {
        "region_code": "asia-pacific",
        "region_name": "Asia Pacific",
        "latitude": 20.0,
        "longitude": 110.0,
        "sentiment_score": 0.17,
        "fear_score": 38.0,
        "momentum_score": 18.0,
        "article_count": 143,
        "top_topic": "Semiconductor demand and exports",
        "updated_at": _now(),
    },
    {
        "region_code": "latin-america",
        "region_name": "Latin America",
        "latitude": -15.0,
        "longitude": -60.0,
        "sentiment_score": 0.05,
        "fear_score": 48.0,
        "momentum_score": 6.0,
        "article_count": 61,
        "top_topic": "Commodities and currency volatility",
        "updated_at": _now(),
    },
]

ARTICLES = [
    {
        "id": "art_001",
        "source_name": "Reuters",
        "title": "US megacap earnings lift risk appetite into the close",
        "summary": "Strong earnings and cooling inflation headlines helped US equities recover.",
        "url": "https://example.com/articles/us-earnings",
        "region_code": "north-america",
        "region_name": "North America",
        "sentiment_score": 0.42,
        "fear_score": 24.0,
        "published_at": _now() - timedelta(hours=2),
    },
    {
        "id": "art_002",
        "source_name": "Financial Times",
        "title": "European manufacturers warn of margin pressure",
        "summary": "Higher energy and transport costs are driving a cautious tone across industrial names.",
        "url": "https://example.com/articles/eu-manufacturing",
        "region_code": "europe",
        "region_name": "Europe",
        "sentiment_score": -0.34,
        "fear_score": 63.0,
        "published_at": _now() - timedelta(hours=4),
    },
    {
        "id": "art_003",
        "source_name": "Nikkei Asia",
        "title": "Chip supply chain expands as AI demand remains elevated",
        "summary": "Manufacturing plans and export optimism improved sentiment across several Asian markets.",
        "url": "https://example.com/articles/asia-chips",
        "region_code": "asia-pacific",
        "region_name": "Asia Pacific",
        "sentiment_score": 0.36,
        "fear_score": 29.0,
        "published_at": _now() - timedelta(hours=1),
    },
    {
        "id": "art_004",
        "source_name": "Bloomberg",
        "title": "Brazilian exporters benefit from firmer commodity demand",
        "summary": "Agriculture and metals linked names outperformed, even as FX volatility stayed elevated.",
        "url": "https://example.com/articles/latam-commodities",
        "region_code": "latin-america",
        "region_name": "Latin America",
        "sentiment_score": 0.18,
        "fear_score": 44.0,
        "published_at": _now() - timedelta(hours=3),
    },
]

REGION_DETAILS = {
    "north-america": {
        "region_code": "north-america",
        "region_name": "North America",
        "summary": "Sentiment is mildly constructive as earnings quality is outweighing macro caution.",
        "date": date.today(),
        "sentiment_score": 0.24,
        "fear_score": 31.0,
        "momentum_score": 12.0,
        "article_count": 128,
        "top_topics": ["Earnings", "Rates", "AI infrastructure"],
        "featured_events": [
            {
                "id": "evt_na_1",
                "title": "Large-cap earnings beat expectations",
                "summary": "A cluster of earnings surprises improved broad risk sentiment.",
                "event_type": "earnings",
                "intensity_score": 74.0,
                "article_count": 21,
            }
        ],
        "featured_articles": [ARTICLES[0]],
    },
    "europe": {
        "region_code": "europe",
        "region_name": "Europe",
        "summary": "The news mix remains cautious as industrial margin pressure offsets isolated growth pockets.",
        "date": date.today(),
        "sentiment_score": -0.08,
        "fear_score": 56.0,
        "momentum_score": -9.0,
        "article_count": 94,
        "top_topics": ["Energy", "Manufacturing", "Rates"],
        "featured_events": [
            {
                "id": "evt_eu_1",
                "title": "Manufacturers flag slower order books",
                "summary": "Forward guidance turned slightly more defensive across several exporters.",
                "event_type": "macro",
                "intensity_score": 68.0,
                "article_count": 17,
            }
        ],
        "featured_articles": [ARTICLES[1]],
    },
    "asia-pacific": {
        "region_code": "asia-pacific",
        "region_name": "Asia Pacific",
        "summary": "Export strength and AI-related capital spending are supporting a positive bias.",
        "date": date.today(),
        "sentiment_score": 0.17,
        "fear_score": 38.0,
        "momentum_score": 18.0,
        "article_count": 143,
        "top_topics": ["Semiconductors", "Exports", "Policy support"],
        "featured_events": [
            {
                "id": "evt_apac_1",
                "title": "AI hardware demand boosts supply chain outlook",
                "summary": "Chip names and suppliers saw stronger coverage momentum.",
                "event_type": "sector-shift",
                "intensity_score": 79.0,
                "article_count": 25,
            }
        ],
        "featured_articles": [ARTICLES[2]],
    },
    "latin-america": {
        "region_code": "latin-america",
        "region_name": "Latin America",
        "summary": "Commodity-linked upside is visible, but currency swings keep fear elevated.",
        "date": date.today(),
        "sentiment_score": 0.05,
        "fear_score": 48.0,
        "momentum_score": 6.0,
        "article_count": 61,
        "top_topics": ["Commodities", "FX", "Trade"],
        "featured_events": [
            {
                "id": "evt_latam_1",
                "title": "Export demand improves for key commodity producers",
                "summary": "Commodities remain a near-term tailwind across the region.",
                "event_type": "trade",
                "intensity_score": 64.0,
                "article_count": 12,
            }
        ],
        "featured_articles": [ARTICLES[3]],
    },
}

HEATMAP_NODES = [
    {
        "name": "US Tech",
        "value": 88.0,
        "region_code": "north-america",
        "sector": "Technology",
        "sentiment_score": 0.44,
        "fear_score": 26.0,
    },
    {
        "name": "EU Industrials",
        "value": 52.0,
        "region_code": "europe",
        "sector": "Industrials",
        "sentiment_score": -0.21,
        "fear_score": 61.0,
    },
    {
        "name": "Asia Semis",
        "value": 79.0,
        "region_code": "asia-pacific",
        "sector": "Semiconductors",
        "sentiment_score": 0.39,
        "fear_score": 33.0,
    },
    {
        "name": "LatAm Materials",
        "value": 63.0,
        "region_code": "latin-america",
        "sector": "Materials",
        "sentiment_score": 0.12,
        "fear_score": 46.0,
    },
]


def list_region_sentiment() -> list[dict]:
    return REGION_SENTIMENT


def get_region_detail(region_code: str) -> dict | None:
    return REGION_DETAILS.get(region_code)


def list_articles(region_code: str | None = None, limit: int = 10, query: str | None = None) -> list[dict]:
    results = ARTICLES

    if region_code:
        results = [article for article in results if article["region_code"] == region_code]

    if query:
        lowered = query.lower()
        results = [
            article
            for article in results
            if lowered in article["title"].lower() or lowered in article["summary"].lower()
        ]

    return results[:limit]


def list_heatmap_nodes() -> list[dict]:
    return HEATMAP_NODES

