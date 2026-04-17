import csv
import hashlib
import os
import re
from collections import Counter, defaultdict
from datetime import UTC, date, datetime
from io import StringIO
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
    FRED_SERIES_URL,
    RISK_COUNTRY_ORDER,
    fred_api_key,
    load_market_risk_scores,
    market_risk_ready,
    refresh_market_risk_pipeline,
)
from stock_data import get_batch_chart_payload, get_chart_payload, get_quote_payload

load_dotenv(Path(__file__).with_name(".env"))

APP_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = APP_ROOT / "supabase" / "schema.sql"
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
REGIONS = ["NA", "EU", "ASIA"]
NA_SUBREGIONS = ["US", "CA"]
ASIA_SUBREGIONS = ["KR", "CN", "JP", "TW", "HK", "SG", "IN"]
EU_SUBREGIONS = ["DE", "UK", "FR"]
REGION_ORDER = [*REGIONS, *NA_SUBREGIONS, *ASIA_SUBREGIONS, *EU_SUBREGIONS]
REGION_NAMES = {
    "NA": "North America",
    "US": "United States",
    "EU": "Europe",
    "ASIA": "Asia",
    "CA": "Canada",
    "KR": "South Korea",
    "CN": "China",
    "JP": "Japan",
    "TW": "Taiwan",
    "HK": "Hong Kong",
    "SG": "Singapore",
    "IN": "India",
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
RISK_FREE_SERIES_ID = "DGS3MO"
RISK_FREE_SOURCE = "FRED - 3-Month Treasury Constant Maturity (DGS3MO)"
RISK_FREE_CSV_URL = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={RISK_FREE_SERIES_ID}"
RISK_FREE_FALLBACK_RATE = float(os.getenv("RISK_FREE_RATE_FALLBACK", "0.04"))

def parse_cors_origins() -> list[str]:
    raw_origins = [
        *os.getenv("FRONTEND_ORIGINS", "").split(","),
        os.getenv("FRONTEND_ORIGIN", ""),
        "http://localhost:3001",
        "http://localhost:3002",
    ]
    cleaned = [origin.strip().rstrip("/") for origin in raw_origins if origin.strip()]
    return list(dict.fromkeys(cleaned))


cors_origins = parse_cors_origins()
cors_origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX", "").strip() or None

app = FastAPI(title="Minimal Global News MVP")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
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


def _normalized_article_title(article: dict[str, Any]) -> str:
    return re.sub(r"\s+", " ", (article.get("title") or "").strip())


def _is_english_summary_candidate(title: str) -> bool:
    if not title:
        return False
    if _contains_cjk(title) or _contains_hangul(title) or _contains_kana(title):
        return False

    ascii_letters = sum(1 for char in title if char.isascii() and char.isalpha())
    return ascii_letters >= 8


def _english_topic_phrase(topic: str | None) -> str:
    mapping = {
        "technology": "technology and chip activity",
        "energy": "energy-market moves",
        "trade": "trade and supply-chain changes",
        "inflation": "rates and inflation updates",
        "banking": "banking and credit developments",
        "manufacturing": "factory and order signals",
        "consumer": "consumer-demand trends",
        "geopolitics": "geopolitical developments",
    }
    return mapping.get(topic or "", "market-moving developments")


def _english_region_summary_fallback(
    *,
    region_name: str,
    article: dict[str, Any],
    sentiment_score: float,
) -> str:
    source_name = article.get("source_name") or article.get("source") or "Global media"
    topic_tags = article.get("topic_tags") or []
    topic_phrase = _english_topic_phrase(topic_tags[0] if topic_tags else None)
    tone = sentiment_label(sentiment_score)

    if tone == "positive":
        return f"{source_name} reports {topic_phrase} supporting {region_name} markets."
    if tone == "negative":
        return f"{source_name} reports {topic_phrase} pressuring {region_name} markets."
    return f"{source_name} reports {topic_phrase} shaping {region_name} markets."


def build_region_summary(
    *,
    region_name: str,
    region_code: str,
    articles: list[dict[str, Any]],
    sentiment_score: float,
) -> str:
    if not articles:
        return f"{region_name} has no major market update yet."

    english_article = next(
        (article for article in articles if _is_english_summary_candidate(_normalized_article_title(article))),
        None,
    )
    primary_article = english_article or articles[0]
    primary_title = _normalized_article_title(primary_article)
    if primary_title:
        trimmed = primary_title.rstrip(".")
        if _is_english_summary_candidate(trimmed):
            if len(trimmed) > 120:
                trimmed = trimmed[:117].rsplit(" ", 1)[0]
                return f"{trimmed}..."
            return f"{trimmed}."

        fallback = _english_region_summary_fallback(
            region_name=region_name,
            article=primary_article,
            sentiment_score=sentiment_score,
        )
        if len(fallback) > 120:
            fallback = fallback[:117].rsplit(" ", 1)[0]
            return f"{fallback}..."
        return fallback

    source_name = primary_article.get("source_name") or primary_article.get("source") or region_name
    fallback = _english_region_summary_fallback(
        region_name=region_name,
        article={"source_name": source_name, "topic_tags": primary_article.get("topic_tags") or []},
        sentiment_score=sentiment_score,
    )
    if len(fallback) > 120:
        fallback = fallback[:117].rsplit(" ", 1)[0]
        return f"{fallback}..."
    return fallback


def db_url() -> str:
    return (
        os.getenv("SUPABASE_DB_URL", "")
        or os.getenv("DATABASE_URL", "")
        or os.getenv("POSTGRES_URL", "")
    )


def risk_free_fallback_payload(reason: str) -> dict[str, Any]:
    return {
        "rate": RISK_FREE_FALLBACK_RATE,
        "rate_percent": round(RISK_FREE_FALLBACK_RATE * 100, 4),
        "source": RISK_FREE_SOURCE,
        "series_id": RISK_FREE_SERIES_ID,
        "as_of": None,
        "last_updated_timestamp": now_utc().isoformat(),
        "is_fallback": True,
        "note": f"Using fallback value. {reason}",
    }


def live_risk_free_payload(*, raw_value: str, observation_date: str | None, note: str) -> dict[str, Any] | None:
    if not raw_value or raw_value == ".":
        return None

    try:
        # FRED returns DGS3MO as percent per annum, e.g. 5.21.
        # The frontend analytics expects decimal form, e.g. 0.0521.
        rate_percent = float(raw_value)
        rate = rate_percent / 100
    except ValueError:
        return None

    return {
        "rate": rate,
        "rate_percent": round(rate_percent, 4),
        "source": RISK_FREE_SOURCE,
        "series_id": RISK_FREE_SERIES_ID,
        "as_of": observation_date,
        "last_updated_timestamp": now_utc().isoformat(),
        "is_fallback": False,
        "note": note,
    }


async def fetch_risk_free_rate_from_csv() -> dict[str, Any] | None:
    # Official FRED graph CSV does not require an API key, so the deployed demo
    # can still use a live DGS3MO value when FRED_API_KEY is not configured.
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(RISK_FREE_CSV_URL)
            response.raise_for_status()
    except Exception:
        return None

    rows = list(csv.DictReader(StringIO(response.text)))
    for row in reversed(rows):
        payload = live_risk_free_payload(
            raw_value=row.get(RISK_FREE_SERIES_ID, ""),
            observation_date=row.get("observation_date") or row.get("DATE"),
            note="Live FRED value from public CSV.",
        )
        if payload:
            return payload

    return None


async def fetch_risk_free_rate_payload() -> dict[str, Any]:
    # DGS3MO is used as the MVP risk-free proxy because short-term U.S.
    # Treasury yields are a common practical approximation for near-zero-risk USD returns.
    if not fred_api_key():
        csv_payload = await fetch_risk_free_rate_from_csv()
        if csv_payload:
            return csv_payload
        return risk_free_fallback_payload("FRED_API_KEY is not configured and public FRED CSV fetch failed.")

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(
                FRED_SERIES_URL,
                params={
                    "series_id": RISK_FREE_SERIES_ID,
                    "api_key": fred_api_key(),
                    "file_type": "json",
                    "sort_order": "desc",
                    "limit": 10,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        csv_payload = await fetch_risk_free_rate_from_csv()
        if csv_payload:
            return csv_payload
        return risk_free_fallback_payload(f"Live FRED fetch failed: {exc}")

    observations = payload.get("observations", [])
    for observation in observations:
        live_payload = live_risk_free_payload(
            raw_value=observation.get("value", ""),
            observation_date=observation.get("date"),
            note="Live FRED API value.",
        )
        if live_payload:
            return live_payload

    csv_payload = await fetch_risk_free_rate_from_csv()
    if csv_payload:
        return csv_payload
    return risk_free_fallback_payload("FRED returned no usable DGS3MO observation.")


def db_configured() -> bool:
    return bool(db_url())


def get_connection() -> psycopg.Connection[Any]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="Database URL is not configured. Add SUPABASE_DB_URL or DATABASE_URL.",
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
    hk_keywords = [
        "hong kong",
        "hang seng",
        "hkex",
        "scmp",
        "hongkongfp",
        "rthk",
    ]
    sg_keywords = [
        "singapore",
        "straits times",
        "business times",
        "sgx",
        "channel news asia",
        "cna.asia",
    ]
    in_keywords = [
        "india",
        "indian",
        "mumbai",
        "nifty",
        "sensex",
        "economic times",
        "moneycontrol",
        "livemint",
        "business standard",
    ]

    if _contains_hangul(combined) or any(keyword in combined for keyword in kr_keywords):
        return "KR"
    if _contains_kana(combined) or any(keyword in combined for keyword in jp_keywords):
        return "JP"
    if any(keyword in combined for keyword in tw_keywords):
        return "TW"
    if any(keyword in combined for keyword in hk_keywords):
        return "HK"
    if any(keyword in combined for keyword in sg_keywords):
        return "SG"
    if any(keyword in combined for keyword in in_keywords):
        return "IN"
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


def detect_na_subregion(title: str, source: str, url: str) -> str | None:
    combined = f"{title} {source} {url}".lower()

    if re.search(r"\b(canada|canadian|toronto|tsx|ottawa)\b", combined) or any(
        keyword in combined for keyword in ["the globe and mail", "bnn bloomberg", "financial post", "cbc.ca"]
    ):
        return "CA"

    if re.search(r"\b(united states|u\.s\.|us|america|american|wall street|nasdaq|s&p 500|dow)\b", combined) or any(
        keyword in combined for keyword in ["cnbc", "marketwatch", "wsj", "wall street journal", "nyse"]
    ):
        return "US"

    return None


def infer_region_codes(title: str, source: str, url: str) -> tuple[str, str | None]:
    subregion = detect_na_subregion(title, source, url)
    if subregion:
        return "NA", subregion

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
            "title": "Canadian banks stay resilient as TSX traders watch growth outlook",
            "source": "Financial Post",
            "url": "https://financialpost.com/mvp-canada-banks-13",
        },
        {
            "title": "Hong Kong equities rebound as Hang Seng tech names recover",
            "source": "South China Morning Post",
            "url": "https://www.scmp.com/business/mvp-hong-kong-tech-14",
        },
        {
            "title": "Singapore lenders firm as regional wealth flows remain steady",
            "source": "The Business Times",
            "url": "https://www.businesstimes.com.sg/mvp-singapore-banks-15",
        },
        {
            "title": "Indian benchmarks climb as domestic inflows support large caps",
            "source": "Economic Times",
            "url": "https://economictimes.indiatimes.com/markets/mvp-india-largecaps-16",
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
    if region in NA_SUBREGIONS:
        return "NA"
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
            detail="Database URL is required before running database setup.",
        )
    return run_schema_setup()


@app.post("/ingest")
async def ingest_news() -> dict[str, Any]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="Database URL is required before ingestion can save data.",
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
            detail="Database URL is required before reading stored articles.",
        )
    return load_articles_from_db(region=region, limit=limit)


@app.get("/api/quote")
def quote(ticker: str = Query(..., description="Ticker symbol such as AAPL")) -> dict[str, Any]:
    try:
        return get_quote_payload(ticker)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch quote data: {exc}") from exc


@app.get("/api/chart")
def chart(
    ticker: str = Query(..., description="Ticker symbol such as AAPL"),
    period: str = Query("1mo", description="Chart period such as 1d, 5d, 1mo, 6mo, 1y, max"),
    interval: str = Query("1d", description="Chart interval such as 5m, 30m, 1d, 1wk"),
) -> dict[str, Any]:
    try:
        return get_chart_payload(ticker, period=period, interval=interval)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch chart data: {exc}") from exc


@app.get("/api/chart/batch")
def chart_batch(
    tickers: str = Query(..., description="Comma-separated ticker symbols such as AAPL,MSFT,NVDA"),
    period: str = Query("1y", description="Chart period such as 1d, 5d, 1mo, 6mo, 1y, max"),
    interval: str = Query("1d", description="Chart interval such as 5m, 30m, 1d, 1wk"),
) -> dict[str, Any]:
    try:
        parsed_tickers = [ticker.strip() for ticker in tickers.split(",") if ticker.strip()]
        return get_batch_chart_payload(parsed_tickers, period=period, interval=interval)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch batch chart data: {exc}") from exc


@app.get("/api/risk-free-rate")
async def risk_free_rate() -> dict[str, Any]:
    return await fetch_risk_free_rate_payload()


@app.post("/api/market-risk/refresh")
async def refresh_market_risk() -> dict[str, Any]:
    if not db_configured():
        raise HTTPException(
            status_code=503,
            detail="Database URL is required before market risk data can be stored.",
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
            detail="Database URL is required before reading market risk scores.",
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
            detail="Database URL is required before reading market risk scores.",
        )

    with get_connection() as conn:
        rows = load_market_risk_scores(conn, normalized)
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No stored market risk score found for {normalized}. Run /api/market-risk/refresh first.",
        )
    return rows[0]
