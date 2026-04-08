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

export type MockArticle = {
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
  category: string;
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
  europe: {
    region_code: "europe",
    region_name: "Europe",
    summary: "Industrial caution is keeping the tone neutral-to-soft, even as selective quality names remain resilient.",
    date: new Date().toISOString().slice(0, 10),
    sentiment_score: -0.08,
    fear_score: 56,
    momentum_score: -9,
    article_count: 94,
    top_topics: ["Energy", "Manufacturing", "Rates"],
    featured_events: [
      {
        id: "evt_eu_1",
        title: "Manufacturers warn of margin pressure",
        summary: "Exporters and industrial firms are signaling a slower near-term demand backdrop.",
        event_type: "macro",
        intensity_score: 68,
        article_count: 17,
      },
    ],
    featured_articles: [
      {
        id: "art_002",
        source_name: "Financial Times",
        title: "European manufacturers warn of margin pressure",
        summary: "Higher energy and transport costs are driving a cautious tone across industrial names.",
        url: "https://example.com/articles/eu-manufacturing",
        region_code: "europe",
        region_name: "Europe",
        sentiment_score: -0.34,
        fear_score: 63,
        published_at: new Date().toISOString(),
      },
    ],
  },
  "asia-pacific": {
    region_code: "asia-pacific",
    region_name: "Asia Pacific",
    summary: "AI supply chain optimism is supporting sentiment, with export momentum acting as an additional tailwind.",
    date: new Date().toISOString().slice(0, 10),
    sentiment_score: 0.17,
    fear_score: 38,
    momentum_score: 18,
    article_count: 143,
    top_topics: ["Semiconductors", "Exports", "Policy support"],
    featured_events: [
      {
        id: "evt_apac_1",
        title: "AI hardware demand boosts supply chains",
        summary: "Chip suppliers and manufacturers continue to benefit from strong AI infrastructure spending.",
        event_type: "sector-shift",
        intensity_score: 79,
        article_count: 25,
      },
    ],
    featured_articles: [
      {
        id: "art_003",
        source_name: "Nikkei Asia",
        title: "Chip supply chain expands as AI demand remains elevated",
        summary: "Manufacturing plans and export optimism improved sentiment across several Asian markets.",
        url: "https://example.com/articles/asia-chips",
        region_code: "asia-pacific",
        region_name: "Asia Pacific",
        sentiment_score: 0.36,
        fear_score: 29,
        published_at: new Date().toISOString(),
      },
    ],
  },
  "latin-america": {
    region_code: "latin-america",
    region_name: "Latin America",
    summary: "Commodity demand is supportive, but currency swings and policy noise are keeping investors selective.",
    date: new Date().toISOString().slice(0, 10),
    sentiment_score: 0.05,
    fear_score: 48,
    momentum_score: 6,
    article_count: 61,
    top_topics: ["Commodities", "FX", "Trade"],
    featured_events: [
      {
        id: "evt_latam_1",
        title: "Commodity exporters regain some momentum",
        summary: "Agriculture and metals linked stories are tilting the region back toward neutral-positive.",
        event_type: "trade",
        intensity_score: 64,
        article_count: 12,
      },
    ],
    featured_articles: [
      {
        id: "art_004",
        source_name: "Bloomberg",
        title: "Brazilian exporters benefit from firmer commodity demand",
        summary: "Agriculture and metals linked names outperformed, even as FX volatility stayed elevated.",
        url: "https://example.com/articles/latam-commodities",
        region_code: "latin-america",
        region_name: "Latin America",
        sentiment_score: 0.18,
        fear_score: 44,
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

export const mockArticles: MockArticle[] = [
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
    category: "Earnings",
  },
  {
    id: "art_002",
    source_name: "Financial Times",
    title: "European manufacturers warn of margin pressure",
    summary: "Higher energy and transport costs are driving a cautious tone across industrial names.",
    url: "https://example.com/articles/eu-manufacturing",
    region_code: "europe",
    region_name: "Europe",
    sentiment_score: -0.34,
    fear_score: 63,
    published_at: new Date().toISOString(),
    category: "Manufacturing",
  },
  {
    id: "art_003",
    source_name: "Nikkei Asia",
    title: "Chip supply chain expands as AI demand remains elevated",
    summary: "Manufacturing plans and export optimism improved sentiment across several Asian markets.",
    url: "https://example.com/articles/asia-chips",
    region_code: "asia-pacific",
    region_name: "Asia Pacific",
    sentiment_score: 0.36,
    fear_score: 29,
    published_at: new Date().toISOString(),
    category: "Semiconductors",
  },
  {
    id: "art_004",
    source_name: "Bloomberg",
    title: "Brazilian exporters benefit from firmer commodity demand",
    summary: "Agriculture and metals linked names outperformed, even as FX volatility stayed elevated.",
    url: "https://example.com/articles/latam-commodities",
    region_code: "latin-america",
    region_name: "Latin America",
    sentiment_score: 0.18,
    fear_score: 44,
    published_at: new Date().toISOString(),
    category: "Materials",
  },
  {
    id: "art_005",
    source_name: "CNBC",
    title: "Wall Street traders look past one weak print as rate hopes return",
    summary: "Risk assets stabilized as investors focused on the next central bank decision.",
    url: "https://example.com/articles/rate-hopes",
    region_code: "north-america",
    region_name: "North America",
    sentiment_score: 0.19,
    fear_score: 33,
    published_at: new Date().toISOString(),
    category: "Rates",
  },
  {
    id: "art_006",
    source_name: "Handelsblatt",
    title: "German industrial outlook softens after new export survey",
    summary: "The latest survey suggests weaker order pipelines across several manufacturing clusters.",
    url: "https://example.com/articles/germany-survey",
    region_code: "europe",
    region_name: "Europe",
    sentiment_score: -0.17,
    fear_score: 58,
    published_at: new Date().toISOString(),
    category: "Macro",
  },
  {
    id: "art_007",
    source_name: "The Japan Times",
    title: "Regional chip suppliers accelerate capex plans",
    summary: "Firms exposed to AI servers and memory upgrades continue to guide higher investment.",
    url: "https://example.com/articles/chip-capex",
    region_code: "asia-pacific",
    region_name: "Asia Pacific",
    sentiment_score: 0.27,
    fear_score: 34,
    published_at: new Date().toISOString(),
    category: "Technology",
  },
  {
    id: "art_008",
    source_name: "Valor",
    title: "LatAm currencies stay volatile despite stronger export demand",
    summary: "Improving commodity demand is being offset by local currency swings in investor sentiment.",
    url: "https://example.com/articles/fx-commodities",
    region_code: "latin-america",
    region_name: "Latin America",
    sentiment_score: -0.04,
    fear_score: 53,
    published_at: new Date().toISOString(),
    category: "FX",
  },
];

export const mockWatchlist = ["North America", "Asia Pacific", "Europe"];
export const mockPromptSuggestions = [
  "Show me the calmest region right now",
  "Why is Europe more risk-off today?",
  "What should a beginner watch in Asia Pacific?",
  "Compare North America and Latin America",
];
