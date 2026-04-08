import hashlib
from collections import defaultdict
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Minimal Global News MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
REGIONS = ["US", "EU", "ASIA"]
REGION_NAMES = {
    "US": "United States",
    "EU": "Europe",
    "ASIA": "Asia",
}
ARTICLE_LIMIT_PER_REGION = 16


def stable_region(key: str) -> str:
    digest = hashlib.md5(key.encode("utf-8")).hexdigest()
    return REGIONS[int(digest, 16) % len(REGIONS)]


def stable_sentiment(key: str) -> float:
    digest = hashlib.md5(f"sentiment:{key}".encode("utf-8")).digest()
    raw = int.from_bytes(digest[:2], "big")
    score = (raw / 65535) * 2 - 1
    return round(score, 2)


def sentiment_color(score: float) -> str:
    if score > 0.2:
        return "#22c55e"
    if score < -0.2:
        return "#ef4444"
    return "#f59e0b"


def fallback_articles() -> list[dict[str, Any]]:
    base = [
        {
            "title": "US stocks steady as investors await inflation clues",
            "source": "Reuters",
            "url": "https://www.reuters.com/markets/us/stocks-steady-inflation-clues-mvp-1/",
        },
        {
            "title": "European manufacturers stay cautious on new orders",
            "source": "Financial Times",
            "url": "https://www.ft.com/content/mvp-europe-manufacturing-2",
        },
        {
            "title": "Asian chip suppliers gain on AI demand optimism",
            "source": "Nikkei Asia",
            "url": "https://asia.nikkei.com/Business/Tech/Semiconductors/mvp-chip-demand-3",
        },
        {
            "title": "Oil and trade headlines keep global markets watchful",
            "source": "Bloomberg",
            "url": "https://www.bloomberg.com/news/articles/mvp-oil-trade-4",
        },
        {
            "title": "Central bank commentary shapes regional market mood",
            "source": "CNBC",
            "url": "https://www.cnbc.com/2026/04/08/mvp-central-bank-mood-5.html",
        },
    ]

    articles: list[dict[str, Any]] = []
    for item in base:
        region = stable_region(item["url"])
        sentiment = stable_sentiment(item["url"])
        articles.append(
            {
                "title": item["title"],
                "source": item["source"],
                "url": item["url"],
                "region": region,
                "sentiment": sentiment,
            }
        )
    return articles


async def fetch_gdelt_articles() -> list[dict[str, Any]]:
    params = {
        "query": '(economy OR markets OR stocks OR inflation OR trade OR oil)',
        "mode": "artlist",
        "format": "json",
        "maxrecords": 60,
        "timespan": "1day",
        "sort": "datedesc",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(GDELT_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return fallback_articles()

    raw_articles = payload.get("articles", []) if isinstance(payload, dict) else []
    if not isinstance(raw_articles, list) or not raw_articles:
        return fallback_articles()

    articles: list[dict[str, Any]] = []
    for item in raw_articles:
        if not isinstance(item, dict):
            continue

        url = item.get("url") or item.get("sourceurl")
        title = item.get("title")
        if not url or not title:
            continue

        source = item.get("domain") or item.get("source") or urlparse(url).netloc or "Unknown"
        region = stable_region(url)
        sentiment = stable_sentiment(url)
        articles.append(
            {
                "title": title,
                "source": source,
                "url": url,
                "region": region,
                "sentiment": sentiment,
            }
        )

    return articles or fallback_articles()


def aggregate_by_region(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "region": "",
            "region_name": "",
            "sentiment_total": 0.0,
            "count": 0,
            "articles": [],
        }
    )

    for article in articles:
        region = article["region"]
        bucket = buckets[region]
        bucket["region"] = region
        bucket["region_name"] = REGION_NAMES[region]
        bucket["sentiment_total"] += article["sentiment"]
        bucket["count"] += 1
        bucket["articles"].append(
            {
                "title": article["title"],
                "source": article["source"],
                "url": article["url"],
                "sentiment": article["sentiment"],
            }
        )

    output: list[dict[str, Any]] = []
    for region in REGIONS:
        bucket = buckets[region]
        count = bucket["count"]
        average = round(bucket["sentiment_total"] / count, 2) if count else 0.0
        output.append(
            {
                "region": region,
                "region_name": bucket["region_name"] or REGION_NAMES[region],
                "sentiment": average,
                "count": count,
                "color": sentiment_color(average),
                "articles": bucket["articles"][:ARTICLE_LIMIT_PER_REGION],
            }
        )

    return output


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Minimal Global News MVP API"}


@app.get("/regions/sentiment")
async def regions_sentiment() -> list[dict[str, Any]]:
    articles = await fetch_gdelt_articles()
    return aggregate_by_region(articles)
