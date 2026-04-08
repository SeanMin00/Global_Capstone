from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.db.postgres import ping_database
from app.models.schemas import (
    ArticleSummary,
    ChatRequest,
    ChatResponse,
    HealthResponse,
    HeatmapResponse,
    RegionDetailResponse,
    RegionSentimentPoint,
)
from app.services.chat import generate_chat_reply
from app.services.ingestion import build_ingestion_plan
from app.services.mock_data import (
    get_region_detail,
    list_articles,
    list_heatmap_nodes,
    list_region_sentiment,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        database_connected=ping_database(),
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/regions/sentiment", response_model=list[RegionSentimentPoint])
def regions_sentiment() -> list[RegionSentimentPoint]:
    return [RegionSentimentPoint(**item) for item in list_region_sentiment()]


@router.get("/regions/{region}", response_model=RegionDetailResponse)
def region_detail(region: str) -> RegionDetailResponse:
    detail = get_region_detail(region)
    if not detail:
        raise HTTPException(status_code=404, detail="Region not found")

    return RegionDetailResponse(**detail)


@router.get("/articles", response_model=list[ArticleSummary])
def articles(
    region: str | None = None,
    limit: int = Query(default=10, ge=1, le=50),
    q: str | None = None,
) -> list[ArticleSummary]:
    return [ArticleSummary(**item) for item in list_articles(region_code=region, limit=limit, query=q)]


@router.get("/heatmap", response_model=HeatmapResponse)
def heatmap() -> HeatmapResponse:
    return HeatmapResponse(
        as_of=datetime.now(timezone.utc),
        nodes=list_heatmap_nodes(),
    )


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return generate_chat_reply(request)


@router.get("/ingestion/plan")
def ingestion_plan() -> dict:
    return build_ingestion_plan()

