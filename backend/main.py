import hashlib
import os
import re
from collections import Counter, defaultdict
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from market_risk import (
    COUNTRY_CONFIGS,
    RISK_COUNTRY_ORDER,
    load_market_risk_scores,
    market_risk_ready,
    refresh_market_risk_pipeline,
)

load_dotenv(Path(__file__).with_name(".env"))

APP_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = APP_ROOT / "supabase" / "schema.sql"
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
REGIONS = ["US", "EU", "ASIA"]
ASIA_SUBREGIONS = ["KR", "CN", "JP", "TW"]
EU_SUBREGIONS = ["DE", "UK", "FR"]
REGION_ORDER = [*REGIONS, *ASIA_SUBREGIONS, *EU_SUBREGIONS]
REGION_NAMES = {
    "US": "United States",
    "EU": "Europe",
    "ASIA": "Asia",
    "KR": "South Korea",
    "CN": "China",
    "JP": "Japan",
    "TW": "Taiwan",
    "DE": "Germany",
    "UK": "United Kingdom",
    "FR": "France",
}
ARTICLE_LIMIT_PER_REGION = int(os.getenv("INGEST_ARTICLE_LIMIT_PER_REGION", "16"))
GDELT_QUERY = os.getenv(
    "GDELT_QUERY",
    "(economy OR markets OR stocks OR inflation OR trade OR oil)",
)
GDELT_MAX_RECORDS = int(os.getenv("GDELT_MAX_RECORDS", "60"))

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3002")
cors_origins = list(
    dict.fromkeys([frontend_origin, "http://localhost:3001", "http://localhost:3002"]),
)

app = FastAPI(title="Minimal Global News MVP")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_utc() -> datetime:
    return datetime.now(UTC)


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


def sentiment_label(score: float) -> str:
    if score > 0.2:
        return "positive"
    if score < -0.2:
        return "negative"
    return "neutral"


def build_region_summary(
    *,
    region_name: str,
    region_code: str,
    articles: list[dict[str, Any]],
    sentiment_score: float,
) -> str:
    if not articles:
        return f"{region_name} has no recent article cluster yet."

    topic_counter: Counter[str] = Counter()
    source_counter: Counter[str] = Counter()
    for article in articles:
        for topic in article.get("topic_tags", []):
            topic_counter.update([topic])
        source_counter.update([article.get("source_name") or article.get("source") or "Unknown"])

    top_topics = [topic.replace("_", " ") for topic, _ in topic_counter.most_common(2)]
    dominant_source = source_counter.most_common(1)[0][0] if source_counter else "major outlets"
    tone = sentiment_label(sentiment_score)
    article_count = len(articles)

    if len(top_topics) >= 2:
        return (
            f"{region_name} is being driven by {top_topics[0]} and {top_topics[1]} themes "
            f"across {article_count} recent articles, with overall tone leaning {tone}."
        )
    if top_topics:
        return (
            f"{region_name} is being driven mainly by {top_topics[0]} headlines from {dominant_source}, "
            f"with overall tone leaning {tone}."
        )

    top_title = articles[0].get("title", "").strip()
    if top_title:
        return (
            f"{region_name} is currently leaning {tone}, led by the latest {dominant_source} headline: "
            f"{top_title[:110].rstrip()}."
        )

    return f"{region_name} is currently leaning {tone} across {article_count} recent articles."


def db_url() -> str:
    return os.getenv("SUPABASE_DB_URL", "")


def db_configured() -> bool:
    return bool(db_url())


def get_connection() -> psycopg.Connection[Any]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is not configured. Add it in backend/.env first.",
        )
    return psycopg.connect(db_url(), row_factory=dict_row)


def _contains_cjk(text: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in text)


def _contains_hangul(text: str) -> bool:
    return any("\uac00" <= char <= "\ud7a3" for char in text)


def _contains_kana(text: str) -> bool:
    return any("\u3040" <= char <= "\u30ff" for char in text)


def detect_asia_subregion(title: str, source: str, url: str) -> str | None:
    combined = f"{title} {source} {url}".lower()

    kr_keywords = [
        "korea",
        "korean",
        "seoul",
        "yonhap",
        "chosun",
        "joongang",
        "hankyung",
        "maeil",
        "mk.co.kr",
        "newspim",
        "n.news.naver",
    ]
    cn_keywords = [
        "china",
        "chinese",
        "beijing",
        "shanghai",
        "shenzhen",
        "xinhua",
        "people.cn",
        "caixin",
        "south china morning post",
        "scmp",
        "qq.com",
        "sina.com",
    ]
    jp_keywords = [
        "japan",
        "japanese",
        "tokyo",
        "nikkei",
        "asahi",
        "mainichi",
        "nhk",
        "yomiuri",
        "japantimes",
        "nikkei.com",
    ]
    tw_keywords = [
        "taiwan",
        "taipei",
        "tsmc",
        "formosa",
        "taiwan semiconductor",
        "taipei times",
        "digitimes",
        "cna.com.tw",
        "udn.com",
    ]

    if _contains_hangul(combined) or any(keyword in combined for keyword in kr_keywords):
        return "KR"
    if _contains_kana(combined) or any(keyword in combined for keyword in jp_keywords):
        return "JP"
    if any(keyword in combined for keyword in tw_keywords):
        return "TW"
    if _contains_cjk(combined) or any(keyword in combined for keyword in cn_keywords):
        return "CN"

    return None


def detect_eu_subregion(title: str, source: str, url: str) -> str | None:
    combined = f"{title} {source} {url}".lower()

    if re.search(r"\b(germany|german|berlin|frankfurt|dax)\b", combined) or any(
        keyword in combined
        for keyword in ["handelsblatt", "tagesschau", "faz.net", "spiegel", "welt.de"]
    ):
        return "DE"
    if re.search(r"\b(united kingdom|britain|british|london)\b", combined) or any(
        keyword in combined
        for keyword in ["ft.com", "the guardian", "telegraph", "bbc", "dailymail.co.uk", "cityam"]
    ):
        return "UK"
    if re.search(r"\b(france|french|paris)\b", combined) or any(
        keyword in combined for keyword in ["cac 40", "le monde", "les echos", "bfmtv", "france24"]
    ):
        return "FR"

    return None


def infer_region_codes(title: str, source: str, url: str) -> tuple[str, str | None]:
    subregion = detect_asia_subregion(title, source, url)
    if subregion:
        return "ASIA", subregion

    subregion = detect_eu_subregion(title, source, url)
    if subregion:
        return "EU", subregion

    return stable_region(url), None


def derive_topics(text: str) -> list[str]:
    lowered = text.lower()
    topic_map = {
        "technology": ["ai", "chip", "semiconductor", "software", "cloud", "tech"],
        "energy": ["oil", "gas", "energy", "crude", "opec"],
        "trade": ["trade", "tariff", "export", "import", "supply chain"],
        "inflation": ["inflation", "rates", "cpi", "central bank", "fed", "ecb"],
        "banking": ["bank", "lender", "credit", "finance"],
        "manufacturing": ["factory", "manufacturing", "industrial", "orders"],
        "consumer": ["retail", "consumer", "luxury", "spending"],
        "geopolitics": ["war", "conflict", "sanction", "iran", "russia", "china"],
    }

    topics = [topic for topic, keywords in topic_map.items() if any(word in lowered for word in keywords)]
    return topics[:4]


def compute_fear_score(title: str, sentiment_score: float) -> float:
    lowered = title.lower()
    fear_terms = [
        "war",
        "crisis",
        "blockade",
        "inflation",
        "tariff",
        "selloff",
        "fall",
        "plunge",
        "risk",
        "volatility",
        "conflict",
    ]
    fear = 50 + max(0, -sentiment_score) * 35
    fear += sum(6 for word in fear_terms if word in lowered)
    return round(max(0, min(100, fear)), 2)


def compute_signal_score(title: str, sentiment_score: float, fear_score: float) -> float:
    intensity_terms = [
        "surge",
        "jump",
        "slump",
        "record",
        "warning",
        "outlook",
        "blockade",
        "tariff",
        "cut",
        "hike",
    ]
    lowered = title.lower()
    signal = abs(sentiment_score) * 60 + abs(fear_score - 50) * 0.6
    signal += sum(4 for word in intensity_terms if word in lowered)
    return round(max(0, min(100, signal)), 2)


def parse_published_at(raw_value: Any) -> datetime:
    if not raw_value:
        return now_utc()

    if isinstance(raw_value, datetime):
        return raw_value.astimezone(UTC)

    if isinstance(raw_value, str):
        cleaned = raw_value.strip()
        for fmt in ("%Y%m%dT%H%M%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z"):
            try:
                return datetime.strptime(cleaned, fmt).astimezone(UTC)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).astimezone(UTC)
        except ValueError:
            return now_utc()

    return now_utc()


def build_article_record(
    *,
    title: str,
    source_name: str,
    url: str,
    summary: str | None = None,
    raw_payload: dict[str, Any] | None = None,
    image_url: str | None = None,
    language: str | None = None,
    published_at: datetime | None = None,
    external_id: str | None = None,
) -> dict[str, Any]:
    region_code, country_code = infer_region_codes(title, source_name, url)
    combined_text = " ".join(part for part in [title, summary or "", source_name] if part)
    topic_tags = derive_topics(combined_text)
    sentiment_score = stable_sentiment(url)
    fear_score = compute_fear_score(title, sentiment_score)
    signal_score = compute_signal_score(title, sentiment_score, fear_score)
    source_domain = urlparse(url).netloc or source_name.lower().replace(" ", "")
    published = (published_at or now_utc()).astimezone(UTC)

    return {
        "external_id": external_id,
        "source_name": source_name,
        "source_domain": source_domain,
        "title": title,
        "summary": summary,
        "body": None,
        "url": url,
        "image_url": image_url,
        "language": language,
        "country_code": country_code,
        "region_code": region_code,
        "region_name": REGION_NAMES[region_code],
        "topic_tags": topic_tags,
        "mentioned_tickers": [],
        "sentiment_score": sentiment_score,
        "fear_score": fear_score,
        "signal_score": signal_score,
        "published_at": published,
        "raw_payload": raw_payload or {},
    }


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
            "title": "Korean chip exporters gain after AI server demand rises",
            "source": "Yonhap",
            "url": "https://en.yna.co.kr/view/mvp-korea-chip-6",
        },
        {
            "title": "China manufacturing names recover as policy support returns",
            "source": "Caixin",
            "url": "https://www.caixinglobal.com/2026-04-08/mvp-china-manufacturing-7",
        },
        {
            "title": "Japan exporters advance as yen pressure eases",
            "source": "Nikkei",
            "url": "https://asia.nikkei.com/Business/Markets/mvp-japan-exporters-8",
        },
        {
            "title": "Taiwan chipmakers rally as AI server orders accelerate",
            "source": "Taipei Times",
            "url": "https://www.taipeitimes.com/News/biz/mvp-taiwan-chip-9",
        },
        {
            "title": "German industrial shares drift as factory orders soften",
            "source": "Handelsblatt",
            "url": "https://www.handelsblatt.com/mvp-germany-industrials-10",
        },
        {
            "title": "UK banks hold firm as London traders watch rate outlook",
            "source": "Financial Times",
            "url": "https://www.ft.com/content/mvp-uk-banks-11",
        },
        {
            "title": "French luxury stocks steady ahead of new demand guidance",
            "source": "Les Echos",
            "url": "https://www.lesechos.fr/mvp-france-luxury-12",
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

    published = now_utc()
    return [
        build_article_record(
            title=item["title"],
            source_name=item["source"],
            url=item["url"],
            raw_payload=item,
            published_at=published,
        )
        for item in base
    ]


async def fetch_gdelt_articles() -> list[dict[str, Any]]:
    params = {
        "query": GDELT_QUERY,
        "mode": "artlist",
        "format": "json",
        "maxrecords": GDELT_MAX_RECORDS,
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

        source_name = item.get("domain") or item.get("source") or urlparse(url).netloc or "Unknown"
        summary = item.get("seendate") or item.get("description")
        published_at = parse_published_at(item.get("seendate") or item.get("published") or item.get("published_at"))
        articles.append(
            build_article_record(
                title=title,
                source_name=source_name,
                url=url,
                summary=summary,
                raw_payload=item,
                image_url=item.get("socialimage") or item.get("image"),
                language=item.get("language"),
                published_at=published_at,
                external_id=item.get("id"),
            )
        )

    return articles or fallback_articles()


def summarize_articles_by_region(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
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
        target_codes = [article["region_code"]]
        if article.get("country_code"):
            target_codes.append(article["country_code"])

        for code in target_codes:
            bucket = buckets[code]
            bucket["region"] = code
            bucket["region_name"] = REGION_NAMES[code]
            bucket["sentiment_total"] += article["sentiment_score"]
            bucket["count"] += 1
            bucket["articles"].append(
                {
                    "title": article["title"],
                    "source": article["source_name"],
                    "source_name": article["source_name"],
                    "url": article["url"],
                    "sentiment": article["sentiment_score"],
                    "topic_tags": article["topic_tags"],
                }
            )

    output: list[dict[str, Any]] = []
    for code in REGION_ORDER:
        bucket = buckets[code]
        count = bucket["count"]
        avg_sentiment = round(bucket["sentiment_total"] / count, 2) if count else 0.0
        summary = build_region_summary(
            region_name=bucket["region_name"] or REGION_NAMES[code],
            region_code=code,
            articles=bucket["articles"],
            sentiment_score=avg_sentiment,
        )
        output.append(
            {
                "region": code,
                "region_name": bucket["region_name"] or REGION_NAMES[code],
                "sentiment": avg_sentiment,
                "count": count,
                "color": sentiment_color(avg_sentiment),
                "summary": summary,
                "articles": bucket["articles"][:ARTICLE_LIMIT_PER_REGION],
            }
        )

    return output


def build_daily_rollup_rows(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[tuple[date, str], dict[str, Any]] = defaultdict(
        lambda: {
            "bucket_date": None,
            "region_code": "",
            "region_name": "",
            "article_count": 0,
            "sentiment_total": 0.0,
            "fear_total": 0.0,
            "signal_total": 0.0,
            "topic_counts": Counter(),
            "top_headline": "",
            "top_headline_score": -1.0,
        }
    )

    for article in articles:
        target_codes = [article["region_code"]]
        if article.get("country_code"):
            target_codes.append(article["country_code"])

        for code in target_codes:
            bucket_date = article["published_at"].date()
            key = (bucket_date, code)
            bucket = buckets[key]
            bucket["bucket_date"] = bucket_date
            bucket["region_code"] = code
            bucket["region_name"] = REGION_NAMES[code]
            bucket["article_count"] += 1
            bucket["sentiment_total"] += article["sentiment_score"]
            bucket["fear_total"] += article["fear_score"]
            bucket["signal_total"] += article["signal_score"]
            bucket["topic_counts"].update(article["topic_tags"])

            headline_score = abs(article["signal_score"]) + abs(article["sentiment_score"]) * 10
            if headline_score > bucket["top_headline_score"]:
                bucket["top_headline"] = article["title"]
                bucket["top_headline_score"] = headline_score

    rows: list[dict[str, Any]] = []
    for bucket in buckets.values():
        article_count = bucket["article_count"]
        avg_sentiment = round(bucket["sentiment_total"] / article_count, 4) if article_count else 0.0
        fear_score = round(bucket["fear_total"] / article_count, 2) if article_count else 50.0
        signal_score = round(bucket["signal_total"] / article_count, 2) if article_count else 0.0
        momentum_score = round(avg_sentiment * 100, 2)
        rows.append(
            {
                "bucket_date": bucket["bucket_date"],
                "region_code": bucket["region_code"],
                "region_name": bucket["region_name"],
                "article_count": article_count,
                "avg_sentiment": avg_sentiment,
                "fear_score": fear_score,
                "momentum_score": momentum_score,
                "signal_score": signal_score,
                "top_topics": [topic for topic, _ in bucket["topic_counts"].most_common(3)],
                "top_headline": bucket["top_headline"] or None,
            }
        )

    return rows


def run_schema_setup() -> dict[str, str]:
    if not SCHEMA_PATH.exists():
        raise HTTPException(status_code=500, detail=f"Schema file not found at {SCHEMA_PATH}")

    schema_sql = SCHEMA_PATH.read_text()
    with psycopg.connect(db_url(), autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)

    return {"status": "ok", "schema": "applied"}


def upsert_articles(conn: psycopg.Connection[Any], articles: list[dict[str, Any]]) -> None:
    rows = [
        (
            article["external_id"],
            article["source_name"],
            article["source_domain"],
            article["title"],
            article["summary"],
            article["body"],
            article["url"],
            article["image_url"],
            article["language"],
            article["country_code"],
            article["region_code"],
            article["region_name"],
            article["topic_tags"],
            article["mentioned_tickers"],
            article["sentiment_score"],
            article["fear_score"],
            article["signal_score"],
            article["published_at"],
            Jsonb(article["raw_payload"]),
        )
        for article in articles
    ]

    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.news_articles (
              external_id,
              source_name,
              source_domain,
              title,
              summary,
              body,
              url,
              image_url,
              language,
              country_code,
              region_code,
              region_name,
              topic_tags,
              mentioned_tickers,
              sentiment_score,
              fear_score,
              signal_score,
              published_at,
              raw_payload
            )
            values (
              %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            on conflict (url) do update set
              external_id = excluded.external_id,
              source_name = excluded.source_name,
              source_domain = excluded.source_domain,
              title = excluded.title,
              summary = excluded.summary,
              body = excluded.body,
              image_url = excluded.image_url,
              language = excluded.language,
              country_code = excluded.country_code,
              region_code = excluded.region_code,
              region_name = excluded.region_name,
              topic_tags = excluded.topic_tags,
              mentioned_tickers = excluded.mentioned_tickers,
              sentiment_score = excluded.sentiment_score,
              fear_score = excluded.fear_score,
              signal_score = excluded.signal_score,
              published_at = excluded.published_at,
              ingested_at = timezone('utc', now()),
              raw_payload = excluded.raw_payload
            """,
            rows,
        )


def upsert_rollups(conn: psycopg.Connection[Any], rollups: list[dict[str, Any]]) -> None:
    rows = [
        (
            row["bucket_date"],
            row["region_code"],
            row["region_name"],
            row["article_count"],
            row["avg_sentiment"],
            row["fear_score"],
            row["momentum_score"],
            row["signal_score"],
            row["top_topics"],
            row["top_headline"],
        )
        for row in rollups
    ]

    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.region_sentiment_daily (
              bucket_date,
              region_code,
              region_name,
              article_count,
              avg_sentiment,
              fear_score,
              momentum_score,
              signal_score,
              top_topics,
              top_headline
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (bucket_date, region_code) do update set
              region_name = excluded.region_name,
              article_count = excluded.article_count,
              avg_sentiment = excluded.avg_sentiment,
              fear_score = excluded.fear_score,
              momentum_score = excluded.momentum_score,
              signal_score = excluded.signal_score,
              top_topics = excluded.top_topics,
              top_headline = excluded.top_headline
            """,
            rows,
        )


def ingest_into_database(articles: list[dict[str, Any]]) -> dict[str, Any]:
    rollups = build_daily_rollup_rows(articles)
    with get_connection() as conn:
        upsert_articles(conn, articles)
        upsert_rollups(conn, rollups)
        conn.commit()

    latest_bucket = max((row["bucket_date"] for row in rollups), default=now_utc().date())
    return {
        "status": "ok",
        "articles_saved": len(articles),
        "rollups_saved": len(rollups),
        "latest_bucket_date": latest_bucket.isoformat(),
    }


def load_regions_from_db() -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            latest_row = cur.execute(
                "select max(bucket_date) as bucket_date from public.region_sentiment_daily"
            ).fetchone()
            latest_bucket = latest_row["bucket_date"] if latest_row else None
            if not latest_bucket:
                return []

            rollup_rows = cur.execute(
                """
                select
                  region_code,
                  region_name,
                  article_count,
                  avg_sentiment,
                  fear_score,
                  signal_score,
                  top_headline
                from public.region_sentiment_daily
                where bucket_date = %s
                order by bucket_date desc, region_code asc
                """,
                (latest_bucket,),
            ).fetchall()

            article_rows = cur.execute(
                """
                select
                  source_name,
                  title,
                  url,
                  sentiment_score,
                  topic_tags,
                  region_code,
                  country_code,
                  published_at
                from public.news_articles
                where published_at::date = %s
                order by published_at desc
                limit 400
                """,
                (latest_bucket,),
            ).fetchall()

    rollup_lookup = {row["region_code"]: row for row in rollup_rows}
    article_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in article_rows:
        article_payload = {
            "title": row["title"],
            "source": row["source_name"],
            "source_name": row["source_name"],
            "url": row["url"],
            "sentiment": float(row["sentiment_score"]),
            "topic_tags": row["topic_tags"] or [],
        }
        article_buckets[row["region_code"]].append(article_payload)
        if row["country_code"]:
            article_buckets[row["country_code"]].append(article_payload)

    output: list[dict[str, Any]] = []
    for code in REGION_ORDER:
        rollup = rollup_lookup.get(code)
        avg_sentiment = float(rollup["avg_sentiment"]) if rollup else 0.0
        article_count = int(rollup["article_count"]) if rollup else 0
        summary = build_region_summary(
            region_name=rollup["region_name"] if rollup else REGION_NAMES[code],
            region_code=code,
            articles=article_buckets.get(code, []),
            sentiment_score=avg_sentiment,
        )
        output.append(
            {
                "region": code,
                "region_name": rollup["region_name"] if rollup else REGION_NAMES[code],
                "sentiment": round(avg_sentiment, 2),
                "count": article_count,
                "color": sentiment_color(avg_sentiment),
                "summary": summary,
                "articles": article_buckets.get(code, [])[:ARTICLE_LIMIT_PER_REGION],
            }
        )

    return output


def load_articles_from_db(region: str | None = None, limit: int = 40) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            if region and region in REGION_NAMES:
                if region in REGIONS:
                    rows = cur.execute(
                        """
                        select
                          source_name,
                          title,
                          url,
                          sentiment_score,
                          fear_score,
                          signal_score,
                          region_code,
                          country_code,
                          published_at
                        from public.news_articles
                        where region_code = %s
                        order by published_at desc
                        limit %s
                        """,
                        (region, limit),
                    ).fetchall()
                else:
                    rows = cur.execute(
                        """
                        select
                          source_name,
                          title,
                          url,
                          sentiment_score,
                          fear_score,
                          signal_score,
                          region_code,
                          country_code,
                          published_at
                        from public.news_articles
                        where country_code = %s
                        order by published_at desc
                        limit %s
                        """,
                        (region, limit),
                    ).fetchall()
            else:
                rows = cur.execute(
                    """
                    select
                      source_name,
                      title,
                      url,
                      sentiment_score,
                      fear_score,
                      signal_score,
                      region_code,
                      country_code,
                      published_at
                    from public.news_articles
                    order by published_at desc
                    limit %s
                    """,
                    (limit,),
                ).fetchall()

    return [
        {
            "source": row["source_name"],
            "title": row["title"],
            "url": row["url"],
            "sentiment": float(row["sentiment_score"]),
            "fear_score": float(row["fear_score"]),
            "signal_score": float(row["signal_score"]),
            "region_code": row["region_code"],
            "country_code": row["country_code"],
            "published_at": row["published_at"].isoformat(),
        }
        for row in rows
    ]


def get_parent_region(region: str) -> str:
    if region in ASIA_SUBREGIONS:
        return "ASIA"
    if region in EU_SUBREGIONS:
        return "EU"
    return region


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Minimal Global News MVP API"}


@app.get("/health")
def health() -> dict[str, Any]:
    payload: dict[str, Any] = {
        "status": "ok",
        "database_configured": db_configured(),
        "market_risk_ready": market_risk_ready(),
        "market_risk_countries": RISK_COUNTRY_ORDER,
        "schema_path": str(SCHEMA_PATH),
    }

    if not db_configured():
        payload["database"] = "not_configured"
        return payload

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                row = cur.execute("select current_database() as db_name").fetchone()
                latest = cur.execute(
                    "select max(bucket_date) as latest_bucket from public.region_sentiment_daily"
                ).fetchone()
        payload["database"] = row["db_name"]
        payload["latest_bucket_date"] = (
            latest["latest_bucket"].isoformat() if latest and latest["latest_bucket"] else None
        )
    except Exception as exc:
        payload["database"] = "error"
        payload["error"] = str(exc)

    return payload


@app.post("/setup-db")
def setup_db() -> dict[str, str]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is required before running database setup.",
        )
    return run_schema_setup()


@app.post("/ingest")
async def ingest_news() -> dict[str, Any]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is required before ingestion can save data.",
        )

    articles = await fetch_gdelt_articles()
    if not articles:
        raise HTTPException(status_code=502, detail="No articles were fetched from GDELT.")

    return ingest_into_database(articles)


@app.get("/regions/sentiment")
async def regions_sentiment() -> list[dict[str, Any]]:
    if db_configured():
        try:
            regions = load_regions_from_db()
            if regions:
                return regions
        except Exception:
            pass

    articles = await fetch_gdelt_articles()
    return summarize_articles_by_region(articles)


@app.get("/articles")
def articles(
    region: str | None = Query(default=None, description="Region code like EU, ASIA, KR, DE"),
    limit: int = Query(default=40, ge=1, le=200),
) -> list[dict[str, Any]]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is required before reading stored articles.",
        )
    return load_articles_from_db(region=region, limit=limit)


@app.post("/api/market-risk/refresh")
async def refresh_market_risk() -> dict[str, Any]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is required before market risk data can be stored.",
        )
    if not market_risk_ready():
        raise HTTPException(
            status_code=503,
            detail="ALPHA_VANTAGE_API_KEY is required before market risk refresh can run.",
        )

    try:
        with get_connection() as conn:
            result = await refresh_market_risk_pipeline(conn)
            conn.commit()
            return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Market risk refresh failed: {exc}") from exc


@app.get("/api/market-risk")
def get_market_risk() -> list[dict[str, Any]]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is required before reading market risk scores.",
        )

    with get_connection() as conn:
        return load_market_risk_scores(conn)


@app.get("/api/market-risk/{country_code}")
def get_market_risk_country(country_code: str) -> dict[str, Any]:
    normalized = country_code.upper()
    if normalized not in COUNTRY_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Unsupported country code: {country_code}")
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_DB_URL is required before reading market risk scores.",
        )

    with get_connection() as conn:
        rows = load_market_risk_scores(conn, normalized)
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No stored market risk score found for {normalized}. Run /api/market-risk/refresh first.",
        )
    return rows[0]
