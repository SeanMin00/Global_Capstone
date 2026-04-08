export type RegionSentimentPoint = {
  region_code: string;
  region_name: string;
  latitude: number;
  longitude: number;
  sentiment_score: number;
  fear_score: number;
  momentum_score: number;
  article_count: number;
  top_topic: string;
  updated_at: string;
};

export type RegionDetail = {
  region_code: string;
  region_name: string;
  summary: string;
  date: string;
  sentiment_score: number;
  fear_score: number;
  momentum_score: number;
  article_count: number;
  top_topics: string[];
  featured_events: {
    id: string;
    title: string;
    summary: string;
    event_type: string;
    intensity_score: number;
    article_count: number;
  }[];
  featured_articles: {
    id: string;
    source_name: string;
    title: string;
    summary: string;
    url: string;
    region_code: string;
    region_name: string;
    sentiment_score: number;
    fear_score: number;
    published_at: string;
  }[];
};

export type HeatmapNode = {
  name: string;
  value: number;
  region_code: string;
  sector: string;
  sentiment_score: number;
  fear_score: number;
};

export const mockRegionSentiment: RegionSentimentPoint[] = [
  {
    region_code: "north-america",
    region_name: "North America",
    latitude: 40,
    longitude: -100,
    sentiment_score: 0.24,
    fear_score: 31,
    momentum_score: 12,
    article_count: 128,
    top_topic: "Rate cuts and earnings resilience",
    updated_at: new Date().toISOString(),
  },
  {
    region_code: "europe",
    region_name: "Europe",
    latitude: 51,
    longitude: 10,
    sentiment_score: -0.08,
    fear_score: 56,
    momentum_score: -9,
    article_count: 94,
    top_topic: "Energy costs and industrial slowdown",
    updated_at: new Date().toISOString(),
  },
  {
    region_code: "asia-pacific",
    region_name: "Asia Pacific",
    latitude: 20,
    longitude: 110,
    sentiment_score: 0.17,
    fear_score: 38,
    momentum_score: 18,
    article_count: 143,
    top_topic: "Semiconductor demand and exports",
    updated_at: new Date().toISOString(),
  },
  {
    region_code: "latin-america",
    region_name: "Latin America",
    latitude: -15,
    longitude: -60,
    sentiment_score: 0.05,
    fear_score: 48,
    momentum_score: 6,
    article_count: 61,
    top_topic: "Commodities and currency volatility",
    updated_at: new Date().toISOString(),
  },
];

export const mockRegionDetails: Record<string, RegionDetail> = {
  "north-america": {
    region_code: "north-america",
    region_name: "North America",
    summary: "Earnings strength is outweighing macro caution, keeping the short-term tone constructive.",
    date: new Date().toISOString().slice(0, 10),
    sentiment_score: 0.24,
    fear_score: 31,
    momentum_score: 12,
    article_count: 128,
    top_topics: ["Earnings", "Rates", "AI infrastructure"],
    featured_events: [
      {
        id: "evt_na_1",
        title: "Large-cap earnings beat expectations",
        summary: "A cluster of earnings surprises improved broad risk sentiment.",
        event_type: "earnings",
        intensity_score: 74,
        article_count: 21,
      },
    ],
    featured_articles: [
      {
        id: "art_001",
        source_name: "Reuters",
        title: "US megacap earnings lift risk appetite into the close",
        summary: "Strong earnings and cooling inflation headlines helped US equities recover.",
        url: "https://example.com/articles/us-earnings",
        region_code: "north-america",
        region_name: "North America",
        sentiment_score: 0.42,
        fear_score: 24,
        published_at: new Date().toISOString(),
      },
    ],
  },
};

export const mockHeatmapNodes: HeatmapNode[] = [
  {
    name: "US Tech",
    value: 88,
    region_code: "north-america",
    sector: "Technology",
    sentiment_score: 0.44,
    fear_score: 26,
  },
  {
    name: "EU Industrials",
    value: 52,
    region_code: "europe",
    sector: "Industrials",
    sentiment_score: -0.21,
    fear_score: 61,
  },
  {
    name: "Asia Semis",
    value: 79,
    region_code: "asia-pacific",
    sector: "Semiconductors",
    sentiment_score: 0.39,
    fear_score: 33,
  },
  {
    name: "LatAm Materials",
    value: 63,
    region_code: "latin-america",
    sector: "Materials",
    sentiment_score: 0.12,
    fear_score: 46,
  },
];

