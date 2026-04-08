from datetime import datetime, timezone

from app.core.config import settings


def build_ingestion_plan() -> dict:
    return {
        "provider": settings.news_provider,
        "mode": "scheduled-pull",
        "schedule_recommendation": "every 15 minutes",
        "steps": [
            "fetch latest business headlines per target country or region",
            "normalize article payloads and deduplicate by canonical URL",
            "score article sentiment and fear using a lightweight classifier",
            "cluster related articles into news_events",
            "aggregate daily region sentiment rollups",
            "persist raw articles, event summaries, and regional metrics",
        ],
        "as_of": datetime.now(timezone.utc).isoformat(),
    }

