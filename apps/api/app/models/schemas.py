from datetime import date, datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    database_connected: bool
    timestamp: datetime


class RegionSentimentPoint(BaseModel):
    region_code: str
    region_name: str
    latitude: float
    longitude: float
    sentiment_score: float = Field(ge=-1, le=1)
    fear_score: float = Field(ge=0, le=100)
    momentum_score: float = Field(ge=-100, le=100)
    article_count: int
    top_topic: str
    updated_at: datetime


class RegionEvent(BaseModel):
    id: str
    title: str
    summary: str
    event_type: str
    intensity_score: float
    article_count: int


class ArticleSummary(BaseModel):
    id: str
    source_name: str
    title: str
    summary: str
    url: str
    region_code: str
    region_name: str
    sentiment_score: float
    fear_score: float
    published_at: datetime


class RegionDetailResponse(BaseModel):
    region_code: str
    region_name: str
    summary: str
    date: date
    sentiment_score: float
    fear_score: float
    momentum_score: float
    article_count: int
    top_topics: list[str]
    featured_events: list[RegionEvent]
    featured_articles: list[ArticleSummary]


class HeatmapNode(BaseModel):
    name: str
    value: float
    region_code: str
    sector: str
    sentiment_score: float
    fear_score: float


class HeatmapResponse(BaseModel):
    as_of: datetime
    nodes: list[HeatmapNode]


class ChatCard(BaseModel):
    title: str
    value: str
    detail: str


class ChatRequest(BaseModel):
    message: str
    region: str | None = None


class ChatResponse(BaseModel):
    answer: str
    mode: str
    region_focus: str | None = None
    cards: list[ChatCard]
    used_tools: list[str]

