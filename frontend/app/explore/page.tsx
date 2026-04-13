"use client";

import { useEffect, useMemo, useState } from "react";

type RegionArticle = {
  title: string;
  source: string;
  url: string;
  sentiment: number;
};

type BaseRegion = "US" | "EU" | "ASIA";
type RegionCode = BaseRegion | "KR" | "CN" | "JP" | "TW" | "DE" | "UK" | "FR";

type RegionSummary = {
  region: RegionCode;
  region_name: string;
  sentiment: number;
  count: number;
  color: string;
  summary: string;
  articles: RegionArticle[];
};

type MarketRiskSnapshot = {
  country: string;
  iso_code: string;
  market_risk_score: number;
  risk_level: "low" | "moderate" | "high";
  component_scores: {
    volatility: number;
    beta: number;
    fx_risk: number;
  };
  raw_metrics: {
    realized_vol_30d: number | null;
    beta_60d: number | null;
    fx_vol_30d: number | null;
    market_return_60d: number | null;
    benchmark_return_60d: number | null;
    vix_close: number | null;
  };
  data_source_used: string[];
  as_of_date: string;
  last_updated_timestamp: string;
  short_explanation: string;
};

type ViewMode = "map" | "chart";

type HeatmapStock = {
  ticker: string;
  name: string;
  sector: string;
  region: BaseRegion;
  detailRegion?: Exclude<RegionCode, BaseRegion>;
  change: number;
  marketCap: number;
  size: "lg" | "md" | "sm";
};

const BASE_REGIONS: BaseRegion[] = ["US", "EU", "ASIA"];
const ASIA_DETAIL_REGIONS: RegionCode[] = ["KR", "CN", "JP", "TW"];
const EU_DETAIL_REGIONS: RegionCode[] = ["DE", "UK", "FR"];
const DETAIL_REGIONS: Record<"ASIA" | "EU", RegionCode[]> = {
  ASIA: ASIA_DETAIL_REGIONS,
  EU: EU_DETAIL_REGIONS,
};
const MARKET_RISK_COUNTRIES = new Set<RegionCode>(["US", "KR", "JP", "CN", "TW", "DE", "UK", "FR"]);

const regionLabels: Record<RegionCode, string> = {
  US: "🇺🇸 US",
  EU: "🇪🇺 EU",
  ASIA: "🌏 ASIA",
  KR: "🇰🇷 KR",
  CN: "🇨🇳 CN",
  JP: "🇯🇵 JP",
  TW: "🇹🇼 TW",
  DE: "🇩🇪 DE",
  UK: "🇬🇧 UK",
  FR: "🇫🇷 FR",
};

const regionPositions: Record<RegionCode, { top: string; left: string }> = {
  US: { top: "42%", left: "24%" },
  EU: { top: "33%", left: "53%" },
  ASIA: { top: "45%", left: "77%" },
  KR: { top: "39%", left: "83%" },
  CN: { top: "44%", left: "75%" },
  JP: { top: "34%", left: "87%" },
  TW: { top: "41.5%", left: "79.5%" },
  DE: { top: "33%", left: "56%" },
  UK: { top: "29%", left: "50%" },
  FR: { top: "38%", left: "52.5%" },
};

const focusedRegionPositions: Record<"ASIA" | "EU", Partial<Record<RegionCode, { top: string; left: string }>>> = {
  ASIA: {
    KR: { top: "36%", left: "29%" },
    CN: { top: "56%", left: "48%" },
    JP: { top: "28%", left: "69%" },
    TW: { top: "48%", left: "76%" },
  },
  EU: {
    UK: { top: "30%", left: "28%" },
    DE: { top: "44%", left: "56%" },
    FR: { top: "62%", left: "38%" },
  },
};

const heatmapStocks: HeatmapStock[] = [
  { ticker: "AAPL", name: "Apple", sector: "Technology", region: "US", change: 1.42, marketCap: 2950, size: "lg" },
  { ticker: "MSFT", name: "Microsoft", sector: "Technology", region: "US", change: 2.14, marketCap: 3150, size: "lg" },
  { ticker: "NVDA", name: "NVIDIA", sector: "Technology", region: "US", change: 3.28, marketCap: 2650, size: "lg" },
  { ticker: "JPM", name: "JPMorgan", sector: "Financial", region: "US", change: -0.74, marketCap: 620, size: "md" },
  { ticker: "XOM", name: "Exxon", sector: "Energy", region: "US", change: -1.81, marketCap: 510, size: "md" },
  { ticker: "SAP", name: "SAP", sector: "Technology", region: "EU", detailRegion: "DE", change: 1.26, marketCap: 250, size: "lg" },
  { ticker: "ASML", name: "ASML", sector: "Technology", region: "EU", change: 2.02, marketCap: 390, size: "lg" },
  { ticker: "SIE", name: "Siemens", sector: "Industrials", region: "EU", detailRegion: "DE", change: -0.62, marketCap: 150, size: "md" },
  { ticker: "MC", name: "LVMH", sector: "Consumer Cyclical", region: "EU", detailRegion: "FR", change: 0.41, marketCap: 360, size: "md" },
  { ticker: "BP", name: "BP", sector: "Energy", region: "EU", detailRegion: "UK", change: -1.22, marketCap: 120, size: "sm" },
  { ticker: "TSM", name: "TSMC", sector: "Technology", region: "ASIA", detailRegion: "TW", change: 2.84, marketCap: 890, size: "lg" },
  { ticker: "SONY", name: "Sony", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "JP", change: 0.93, marketCap: 150, size: "md" },
  { ticker: "BABA", name: "Alibaba", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "CN", change: -2.17, marketCap: 210, size: "lg" },
  { ticker: "005930", name: "Samsung", sector: "Technology", region: "ASIA", detailRegion: "KR", change: 1.73, marketCap: 420, size: "lg" },
  { ticker: "HDB", name: "HDFC Bank", sector: "Financial", region: "ASIA", change: -0.38, marketCap: 145, size: "sm" },
  { ticker: "GOOG", name: "Alphabet", sector: "Communication Services", region: "US", change: 1.12, marketCap: 2150, size: "lg" },
  { ticker: "META", name: "Meta", sector: "Communication Services", region: "US", change: -0.61, marketCap: 1320, size: "md" },
  { ticker: "AMZN", name: "Amazon", sector: "Consumer Cyclical", region: "US", change: 1.58, marketCap: 1960, size: "lg" },
  { ticker: "TSLA", name: "Tesla", sector: "Consumer Cyclical", region: "US", change: -2.44, marketCap: 610, size: "md" },
  { ticker: "WMT", name: "Walmart", sector: "Consumer Defensive", region: "US", change: 0.44, marketCap: 540, size: "md" },
  { ticker: "KO", name: "Coca-Cola", sector: "Consumer Defensive", region: "US", change: 0.31, marketCap: 290, size: "sm" },
  { ticker: "LLY", name: "Eli Lilly", sector: "Healthcare", region: "US", change: 2.37, marketCap: 770, size: "lg" },
  { ticker: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", region: "US", change: -0.29, marketCap: 380, size: "md" },
  { ticker: "CAT", name: "Caterpillar", sector: "Industrials", region: "US", change: 0.72, marketCap: 165, size: "md" },
  { ticker: "BA", name: "Boeing", sector: "Industrials", region: "US", change: -1.46, marketCap: 120, size: "md" },
  { ticker: "PLD", name: "Prologis", sector: "Real Estate", region: "US", change: 0.17, marketCap: 110, size: "sm" },
  { ticker: "AMT", name: "American Tower", sector: "Real Estate", region: "US", change: -0.41, marketCap: 95, size: "sm" },
  { ticker: "NEE", name: "NextEra", sector: "Utilities", region: "US", change: 0.23, marketCap: 145, size: "sm" },
  { ticker: "DUK", name: "Duke Energy", sector: "Utilities", region: "US", change: -0.18, marketCap: 85, size: "sm" },
  { ticker: "LIN", name: "Linde", sector: "Basic Materials", region: "EU", detailRegion: "DE", change: 0.96, marketCap: 210, size: "md" },
  { ticker: "RIO", name: "Rio Tinto", sector: "Basic Materials", region: "EU", detailRegion: "UK", change: -1.09, marketCap: 115, size: "md" },
  { ticker: "BNP", name: "BNP Paribas", sector: "Financial", region: "EU", detailRegion: "FR", change: -0.34, marketCap: 90, size: "md" },
  { ticker: "ADS", name: "Adidas", sector: "Consumer Cyclical", region: "EU", detailRegion: "DE", change: 0.67, marketCap: 45, size: "sm" },
  { ticker: "NESN", name: "Nestle", sector: "Consumer Defensive", region: "EU", change: -0.22, marketCap: 310, size: "sm" },
  { ticker: "NVO", name: "Novo Nordisk", sector: "Healthcare", region: "EU", change: 1.81, marketCap: 570, size: "lg" },
  { ticker: "ENEL", name: "Enel", sector: "Utilities", region: "EU", change: 0.12, marketCap: 70, size: "sm" },
  { ticker: "SU", name: "Schneider", sector: "Industrials", region: "EU", detailRegion: "FR", change: 0.58, marketCap: 130, size: "sm" },
  { ticker: "REL", name: "Relx", sector: "Communication Services", region: "EU", detailRegion: "UK", change: 0.35, marketCap: 78, size: "sm" },
  { ticker: "AIR", name: "Airbus", sector: "Industrials", region: "EU", detailRegion: "FR", change: -0.87, marketCap: 120, size: "md" },
  { ticker: "PTR", name: "PetroChina", sector: "Energy", region: "ASIA", detailRegion: "CN", change: 0.66, marketCap: 165, size: "md" },
  { ticker: "7203", name: "Toyota", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "JP", change: 1.06, marketCap: 320, size: "lg" },
  { ticker: "9984", name: "SoftBank", sector: "Communication Services", region: "ASIA", detailRegion: "JP", change: -0.93, marketCap: 95, size: "md" },
  { ticker: "6861", name: "Keyence", sector: "Technology", region: "ASIA", detailRegion: "JP", change: 1.24, marketCap: 130, size: "md" },
  { ticker: "1398", name: "ICBC", sector: "Financial", region: "ASIA", detailRegion: "CN", change: 0.28, marketCap: 220, size: "sm" },
  { ticker: "KHC", name: "Hengan", sector: "Consumer Defensive", region: "ASIA", detailRegion: "CN", change: -0.14, marketCap: 35, size: "sm" },
  { ticker: "2317", name: "Foxconn", sector: "Industrials", region: "ASIA", detailRegion: "TW", change: 0.77, marketCap: 85, size: "md" },
  { ticker: "0883", name: "CNOOC", sector: "Energy", region: "ASIA", detailRegion: "CN", change: -1.36, marketCap: 145, size: "sm" },
  { ticker: "3988", name: "Bank of China", sector: "Financial", region: "ASIA", detailRegion: "CN", change: 0.18, marketCap: 150, size: "sm" },
  { ticker: "9618", name: "JD.com", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "CN", change: -1.11, marketCap: 55, size: "md" },
  { ticker: "HMC", name: "Honda", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "JP", change: 0.54, marketCap: 55, size: "sm" },
  { ticker: "4704", name: "Trend Micro", sector: "Technology", region: "ASIA", detailRegion: "JP", change: 0.49, marketCap: 35, size: "sm" },
  { ticker: "TCL", name: "TCL Zhonghuan", sector: "Basic Materials", region: "ASIA", detailRegion: "CN", change: -0.43, marketCap: 24, size: "sm" },
];

const sectorOrder = [
  "Technology",
  "Financial",
  "Consumer Cyclical",
  "Communication Services",
  "Healthcare",
  "Consumer Defensive",
  "Industrials",
  "Real Estate",
  "Utilities",
  "Energy",
  "Basic Materials",
];

function getRegionMarketCap(region: RegionCode) {
  if (ASIA_DETAIL_REGIONS.includes(region) || EU_DETAIL_REGIONS.includes(region)) {
    return heatmapStocks
      .filter((stock) => stock.detailRegion === region)
      .reduce((sum, stock) => sum + stock.marketCap, 0);
  }
  return heatmapStocks
    .filter((stock) => stock.region === region)
    .reduce((sum, stock) => sum + stock.marketCap, 0);
}

function isAsiaFamily(region: RegionCode) {
  return region === "ASIA" || ASIA_DETAIL_REGIONS.includes(region);
}

function isEuFamily(region: RegionCode) {
  return region === "EU" || EU_DETAIL_REGIONS.includes(region);
}

function getParentRegion(region: RegionCode): BaseRegion {
  if (isAsiaFamily(region)) return "ASIA";
  if (isEuFamily(region)) return "EU";
  return "US";
}

function sentimentLabel(score: number) {
  if (score > 0.2) return "Positive";
  if (score < -0.2) return "Negative";
  return "Neutral";
}

function sentimentGradient(score: number) {
  if (score > 0.2) return "linear-gradient(135deg, #22c55e, #bef264)";
  if (score < -0.2) return "linear-gradient(135deg, #ef4444, #fb923c)";
  return "linear-gradient(135deg, #f59e0b, #fde68a)";
}

function sentimentBackground(score: number) {
  if (score > 0.2) return "rgba(34, 197, 94, 0.18)";
  if (score < -0.2) return "rgba(239, 68, 68, 0.18)";
  return "rgba(245, 158, 11, 0.18)";
}

function sentimentWidth(score: number) {
  return `${Math.round(((score + 1) / 2) * 100)}%`;
}

function stockToneClass(change: number) {
  if (change > 0.5) return "heat-positive";
  if (change < -0.5) return "heat-negative";
  return "heat-neutral";
}

function stockSizeClass(size: HeatmapStock["size"]) {
  if (size === "lg") return "heat-tile-lg";
  if (size === "md") return "heat-tile-md";
  return "heat-tile-sm";
}

function riskToneLabel(level: MarketRiskSnapshot["risk_level"] | null) {
  if (level === "high") return "High";
  if (level === "moderate") return "Moderate";
  if (level === "low") return "Low";
  return "N/A";
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

function scaleBubbleSize(value: number, minValue: number, maxValue: number, minSize: number, maxSize: number) {
  if (value <= 0) {
    return minSize;
  }

  if (maxValue <= minValue) {
    return (minSize + maxSize) / 2;
  }

  const normalized =
    (Math.sqrt(value) - Math.sqrt(minValue)) / (Math.sqrt(maxValue) - Math.sqrt(minValue));
  return Math.round(minSize + normalized * (maxSize - minSize));
}

export default function ExplorePage() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>("EU");
  const [mapFocusRegion, setMapFocusRegion] = useState<"ASIA" | "EU" | null>(null);
  const [selectedTicker, setSelectedTicker] = useState("ASML");
  const [selectedSector, setSelectedSector] = useState("Technology");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketRisk, setMarketRisk] = useState<MarketRiskSnapshot | null>(null);
  const [marketRiskLoading, setMarketRiskLoading] = useState(false);

  useEffect(() => {
    async function loadRegions() {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:8000/regions/sentiment");
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const payload = (await response.json()) as RegionSummary[];
        setRegions(payload);
        const baseRegionsOnly = payload.filter((item) =>
          BASE_REGIONS.includes(item.region as BaseRegion),
        );
        const topMarketRegion = [...baseRegionsOnly].sort(
          (a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region),
        )[0];
        if (topMarketRegion?.region) {
          setSelectedRegion(topMarketRegion.region);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadRegions();
  }, []);

  useEffect(() => {
    if (viewMode !== "chart") {
      return;
    }

    if (selectedRegion !== "US" && selectedRegion !== "EU" && selectedRegion !== "ASIA") {
      setSelectedRegion(getParentRegion(selectedRegion));
    }
  }, [selectedRegion, viewMode]);

  useEffect(() => {
    if (viewMode === "chart") {
      setMapFocusRegion(null);
      return;
    }

    if (ASIA_DETAIL_REGIONS.includes(selectedRegion)) {
      setMapFocusRegion("ASIA");
      return;
    }

    if (EU_DETAIL_REGIONS.includes(selectedRegion)) {
      setMapFocusRegion("EU");
      return;
    }
  }, [selectedRegion, viewMode]);

  useEffect(() => {
    const firstStock = heatmapStocks.find((stock) => stock.region === selectedRegion);
    if (firstStock) {
      setSelectedTicker(firstStock.ticker);
    }
    const sectorTotals = new Map<string, number>();
    for (const stock of heatmapStocks.filter((item) => item.region === selectedRegion)) {
      sectorTotals.set(stock.sector, (sectorTotals.get(stock.sector) ?? 0) + stock.marketCap);
    }

    const firstSector =
      [...sectorTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Technology";
    setSelectedSector(firstSector);
  }, [selectedRegion]);

  useEffect(() => {
    async function loadMarketRisk() {
      if (!MARKET_RISK_COUNTRIES.has(selectedRegion)) {
        setMarketRisk(null);
        return;
      }

      try {
        setMarketRiskLoading(true);
        const response = await fetch(`http://localhost:8000/api/market-risk/${selectedRegion}`);
        if (!response.ok) {
          setMarketRisk(null);
          return;
        }

        const payload = (await response.json()) as MarketRiskSnapshot;
        setMarketRisk(payload);
      } catch {
        setMarketRisk(null);
      } finally {
        setMarketRiskLoading(false);
      }
    }

    if (viewMode === "map") {
      loadMarketRisk();
    }
  }, [selectedRegion, viewMode]);

  const activeRegion = useMemo(
    () => regions.find((region) => region.region === selectedRegion) ?? regions[0],
    [regions, selectedRegion],
  );

  const mapRegionLookup = useMemo(
    () => new Map(regions.map((region) => [region.region, region])),
    [regions],
  );

  const sortedRegions = useMemo(
    () =>
      [...regions]
        .filter((region) => BASE_REGIONS.includes(region.region as BaseRegion))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
    [regions],
  );

  const articleSortedRegions = useMemo(
    () =>
      [...regions]
        .filter((region) => BASE_REGIONS.includes(region.region as BaseRegion))
        .sort((a, b) => b.count - a.count),
    [regions],
  );

  const detailRegionsByGroup = useMemo(
    () => ({
      ASIA: DETAIL_REGIONS.ASIA.map((code) => mapRegionLookup.get(code))
        .filter((region): region is RegionSummary => Boolean(region))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
      EU: DETAIL_REGIONS.EU.map((code) => mapRegionLookup.get(code))
        .filter((region): region is RegionSummary => Boolean(region))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
    }),
    [mapRegionLookup],
  );

  const baseMapRegions = useMemo(
    () =>
      BASE_REGIONS.map((code) => mapRegionLookup.get(code)).filter(
        (region): region is RegionSummary => Boolean(region),
      ),
    [mapRegionLookup],
  );

  const currentMapRegions = useMemo(() => {
    if (!mapFocusRegion) {
      return baseMapRegions;
    }

    return detailRegionsByGroup[mapFocusRegion];
  }, [baseMapRegions, detailRegionsByGroup, mapFocusRegion]);

  const mapBubbleMetrics = useMemo(() => {
    const positiveCaps = currentMapRegions
      .map((region) => getRegionMarketCap(region.region))
      .filter((marketCap) => marketCap > 0);
    const minCap = positiveCaps.length ? Math.min(...positiveCaps) : 0;
    const maxCap = positiveCaps.length ? Math.max(...positiveCaps) : 0;
    const minSize = mapFocusRegion ? 140 : 220;
    const maxSize = mapFocusRegion ? 280 : 420;

    return new Map(
      currentMapRegions.map((region) => {
        const marketCap = getRegionMarketCap(region.region);
        const size = scaleBubbleSize(marketCap, minCap, maxCap, minSize, maxSize);

        return [
          region.region,
          {
            marketCap,
            size,
          },
        ];
      }),
    );
  }, [currentMapRegions, mapFocusRegion]);

  const regionStocks = useMemo(
    () => heatmapStocks.filter((stock) => stock.region === selectedRegion),
    [selectedRegion],
  );

  const sortedSectors = useMemo(() => {
    const totals = new Map<string, number>();

    for (const stock of regionStocks) {
      totals.set(stock.sector, (totals.get(stock.sector) ?? 0) + stock.marketCap);
    }

    return [...sectorOrder]
      .filter((sector) => totals.has(sector))
      .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  }, [regionStocks]);

  const filteredRegionStocks = useMemo(
    () =>
      selectedSector === "All"
        ? regionStocks
        : regionStocks.filter((stock) => stock.sector === selectedSector),
    [regionStocks, selectedSector],
  );

  const activeStock = useMemo(
    () => filteredRegionStocks.find((stock) => stock.ticker === selectedTicker) ?? filteredRegionStocks[0] ?? regionStocks[0],
    [filteredRegionStocks, regionStocks, selectedTicker],
  );

  function getMapPosition(region: RegionCode) {
    if (mapFocusRegion && focusedRegionPositions[mapFocusRegion][region]) {
      return focusedRegionPositions[mapFocusRegion][region]!;
    }

    return regionPositions[region];
  }

  function enterMapGroup(group: "ASIA" | "EU") {
    const defaultRegion = detailRegionsByGroup[group][0]?.region ?? group;
    setMapFocusRegion(group);
    setSelectedRegion(defaultRegion);
  }

  function returnToGlobalMap() {
    const fallbackRegion = mapFocusRegion ?? getParentRegion(selectedRegion);
    setMapFocusRegion(null);
    setSelectedRegion(fallbackRegion);
  }

  function selectRegion(region: RegionCode) {
    if (viewMode === "chart") {
      setMapFocusRegion(null);
      setSelectedRegion(getParentRegion(region));
      return;
    }

    if (region === "ASIA" || region === "EU") {
      enterMapGroup(region);
      return;
    }

    if (isAsiaFamily(region)) {
      setMapFocusRegion("ASIA");
      setSelectedRegion(region);
      return;
    }

    if (isEuFamily(region)) {
      setMapFocusRegion("EU");
      setSelectedRegion(region);
      return;
    }

    setMapFocusRegion(null);
    setSelectedRegion(region);
  }

  return (
    <main className="explore-page">
      <section className="explore-shell">
        <aside className="left-rail no-logo">
          <div className="rail-stack compact">
            <button
              type="button"
              className={`rail-button ${viewMode === "map" ? "active" : ""}`}
              onClick={() => setViewMode("map")}
            >
              Map
            </button>
            <button
              type="button"
              className={`rail-button ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              Chart
            </button>
          </div>
        </aside>

        <div className="explore-main">
          <header className="hero">
            <div>
              <p className="eyebrow">Minimal working MVP</p>
              <h1>Global News Pulse</h1>
              <p className="hero-copy">
                {viewMode === "map"
                  ? "Click a region on the map. The right panel updates with related headlines, and sentiment changes the marker color."
                  : "Switch to chart mode for a Finviz-style stock heatmap. It is frontend-only for now and grouped by the selected region."}
              </p>
            </div>
            <div className="hero-badge">
              {viewMode === "map" ? "Map + News Panel" : "Stock Heatmap"}
            </div>
          </header>

          {loading ? <div className="state-card">Loading live news from GDELT...</div> : null}
          {error ? <div className="state-card error-card">Failed to load API: {error}</div> : null}

          {!loading && regions.length > 0 ? (
            <>
              <div className="region-tabs">
                {viewMode === "chart"
                  ? sortedRegions.map((region) => (
                      <button
                        key={region.region}
                        type="button"
                        className={`region-tab ${region.region === selectedRegion ? "active" : ""}`}
                        onClick={() => setSelectedRegion(region.region)}
                        style={{
                          borderColor:
                            region.region === selectedRegion ? region.color : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <span>{regionLabels[region.region]}</span>
                        <strong>{Math.round(getRegionMarketCap(region.region))}B mcap</strong>
                      </button>
                    ))
                  : articleSortedRegions.map((region) => (
                      <button
                        key={region.region}
                        type="button"
                        className={`region-tab ${
                          (mapFocusRegion ? mapFocusRegion === region.region : selectedRegion === region.region)
                            ? "active"
                            : ""
                        }`}
                        onClick={() => selectRegion(region.region)}
                        style={{
                          borderColor:
                            (mapFocusRegion ? mapFocusRegion === region.region : selectedRegion === region.region)
                              ? region.color
                              : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <span>{regionLabels[region.region]}</span>
                        <strong>{region.count} articles</strong>
                      </button>
                    ))}
              </div>

              {viewMode === "map" ? (
                <div className="explore-grid">
                  <section className="map-panel">
                    <div className="map-header">
                      <div>
                        <p className="eyebrow">Map view</p>
                        <h2>Regional sentiment map</h2>
                      </div>
                      <div className="map-chip">
                        {mapFocusRegion ? `${mapRegionLookup.get(mapFocusRegion)?.region_name} focus` : "Global view"}
                      </div>
                    </div>

                    {mapFocusRegion ? (
                      <div className="map-detail-toolbar">
                        <button type="button" className="map-back-button" onClick={returnToGlobalMap}>
                          ← Back to Global
                        </button>
                        <div className="map-detail-meta">
                          <strong>{mapRegionLookup.get(mapFocusRegion)?.region_name}</strong>
                          <span>
                            {Math.round(getRegionMarketCap(mapFocusRegion))}B mcap ·{" "}
                            {mapRegionLookup.get(mapFocusRegion)?.count ?? 0} articles
                          </span>
                        </div>
                        <div className="map-detail-tabs">
                          {detailRegionsByGroup[mapFocusRegion].map((region) => (
                            <button
                              key={region.region}
                              type="button"
                              className={`map-detail-tab ${region.region === selectedRegion ? "active" : ""}`}
                              onClick={() => selectRegion(region.region)}
                              style={{
                                borderColor:
                                  region.region === selectedRegion
                                    ? region.color
                                    : "rgba(255,255,255,0.08)",
                              }}
                            >
                              <span>{regionLabels[region.region]}</span>
                              <strong>{Math.round(getRegionMarketCap(region.region))}B</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="map-stage">
                      {currentMapRegions.map((region) => {
                        const bubble = mapBubbleMetrics.get(region.region);
                        if (!bubble) {
                          return null;
                        }

                        return (
                          <div
                            key={`${region.region}-bubble`}
                            className={`map-bubble ${mapFocusRegion ? "detail-bubble" : "base-bubble"} ${
                              region.region === selectedRegion ? "active" : ""
                            }`}
                            style={{
                              top: getMapPosition(region.region).top,
                              left: getMapPosition(region.region).left,
                              width: `${bubble.size}px`,
                              height: `${bubble.size}px`,
                              background: sentimentBackground(region.sentiment),
                              borderColor:
                                region.region === selectedRegion
                                  ? "rgba(255,255,255,0.2)"
                                  : "rgba(56, 189, 248, 0.16)",
                              boxShadow:
                                region.region === selectedRegion
                                  ? "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.24), inset 0 0 60px rgba(255,255,255,0.05)"
                                  : "0 22px 60px rgba(0,0,0,0.16), inset 0 0 40px rgba(255,255,255,0.04)",
                            }}
                          >
                            <span className="bubble-cap">{Math.round(bubble.marketCap)}B</span>
                          </div>
                        );
                      })}

                      {currentMapRegions.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`map-marker ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => selectRegion(region.region)}
                          style={{
                            top: getMapPosition(region.region).top,
                            left: getMapPosition(region.region).left,
                          }}
                        >
                          <span
                            className="marker-glow"
                            style={{ background: sentimentBackground(region.sentiment) }}
                          />
                          <span
                            className="marker-core"
                            style={{ background: sentimentGradient(region.sentiment) }}
                          />
                          <span className="marker-label">
                            <strong>{regionLabels[region.region]}</strong>
                            <small>{sentimentLabel(region.sentiment)}</small>
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="bottom-summary">
                      {(mapFocusRegion ? detailRegionsByGroup[mapFocusRegion] : articleSortedRegions).map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`summary-card ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => selectRegion(region.region)}
                        >
                          <span>{region.region_name}</span>
                          <strong>
                            Mcap: {Math.round(getRegionMarketCap(region.region))}B · Sentiment:{" "}
                            {region.sentiment.toFixed(2)}
                          </strong>
                        </button>
                      ))}
                    </div>
                  </section>

                  <aside className="news-panel">
                    {activeRegion ? (
                      <>
                        <div className="news-header">
                          <div>
                            <p className="eyebrow">{activeRegion.region}</p>
                            <h2>{activeRegion.region_name}</h2>
                          </div>
                        </div>

                        <div className="summary-hero-card">
                          <div className="summary-hero-top">
                            <span className="summary-hero-label">Daily Brief</span>
                            <div className="sentiment-pill">{sentimentLabel(activeRegion.sentiment)}</div>
                          </div>
                          <p className="summary-hero-copy">{activeRegion.summary}</p>
                        </div>

                        <div className="sentiment-bar">
                          <div
                            className="sentiment-bar-fill"
                            style={{
                              width: sentimentWidth(activeRegion.sentiment),
                              background: sentimentGradient(activeRegion.sentiment),
                            }}
                          />
                        </div>

                        <div className="news-metrics">
                          <div className="metric-box">
                            <span>Sentiment</span>
                            <strong>{activeRegion.sentiment.toFixed(2)}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Market risk</span>
                            <strong>
                              {marketRiskLoading
                                ? "..."
                                : marketRisk
                                  ? marketRisk.market_risk_score.toFixed(1)
                                  : "--"}
                            </strong>
                          </div>
                          <div className="metric-box">
                            <span>Market cap</span>
                            <strong>{Math.round(getRegionMarketCap(activeRegion.region))}B</strong>
                          </div>
                          <div className="metric-box">
                            <span>Articles</span>
                            <strong>{activeRegion.count}</strong>
                          </div>
                        </div>

                        <div className="risk-summary-card">
                          <div className="risk-summary-header">
                            <strong>Market Risk</strong>
                            <span className={`risk-level-pill risk-${marketRisk?.risk_level ?? "none"}`}>
                              {marketRiskLoading ? "Loading" : riskToneLabel(marketRisk?.risk_level ?? null)}
                            </span>
                          </div>
                          <p className="risk-summary-copy">
                            {marketRisk
                              ? marketRisk.short_explanation
                              : MARKET_RISK_COUNTRIES.has(activeRegion.region)
                                ? "Run the market risk refresh pipeline to show this country risk score."
                                : "Market risk is currently available for US, KR, JP, CN, and TW."}
                          </p>
                          {marketRisk ? (
                            <div className="risk-breakdown-grid">
                              <div className="risk-breakdown-item">
                                <span>Volatility</span>
                                <strong>{marketRisk.component_scores.volatility.toFixed(1)}</strong>
                                <small>{formatPercent(marketRisk.raw_metrics.realized_vol_30d)}</small>
                              </div>
                              <div className="risk-breakdown-item">
                                <span>Beta</span>
                                <strong>{marketRisk.component_scores.beta.toFixed(1)}</strong>
                                <small>
                                  {marketRisk.raw_metrics.beta_60d !== null
                                    ? marketRisk.raw_metrics.beta_60d.toFixed(2)
                                    : "--"}
                                </small>
                              </div>
                              <div className="risk-breakdown-item">
                                <span>FX Risk</span>
                                <strong>{marketRisk.component_scores.fx_risk.toFixed(1)}</strong>
                                <small>{formatPercent(marketRisk.raw_metrics.fx_vol_30d)}</small>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="article-list">
                          {activeRegion.articles.map((article) => (
                            <a
                              key={article.url}
                              href={article.url}
                              target="_blank"
                              rel="noreferrer"
                              className="article-card"
                            >
                              <div className="article-meta">
                                <span>{article.source}</span>
                                <span
                                  className="article-tone"
                                  style={{
                                    color:
                                      article.sentiment > 0.2
                                        ? "#86efac"
                                        : article.sentiment < -0.2
                                          ? "#fca5a5"
                                          : "#fde68a",
                                  }}
                                >
                                  {sentimentLabel(article.sentiment)}
                                </span>
                              </div>
                              <h3>{article.title}</h3>
                              <p>Open original article</p>
                            </a>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="state-card">No region selected.</div>
                    )}
                  </aside>
                </div>
              ) : (
                <div className="explore-grid">
                  <section className="map-panel">
                    <div className="map-header">
                      <div>
                        <p className="eyebrow">Chart view</p>
                        <h2>Regional stock heatmap</h2>
                      </div>
                      <div className="map-chip">{activeRegion?.region_name}</div>
                    </div>

                    <div className="chart-shell">
                      <aside className="sector-rail">
                        <button
                          type="button"
                          className={`sector-link ${selectedSector === "All" ? "active" : ""}`}
                          onClick={() => setSelectedSector("All")}
                        >
                          All
                        </button>
                        {sortedSectors.map((sector) => (
                          <button
                            key={sector}
                            type="button"
                            className={`sector-link ${selectedSector === sector ? "active" : ""}`}
                            onClick={() => setSelectedSector(sector)}
                          >
                            {sector}
                            <span className="sector-cap">
                              {Math.round(
                                regionStocks
                                  .filter((stock) => stock.sector === sector)
                                  .reduce((sum, stock) => sum + stock.marketCap, 0),
                              )}B
                            </span>
                          </button>
                        ))}
                      </aside>

                      <div className="heatmap-stage">
                        <div className="heatmap-grid">
                          {filteredRegionStocks.map((stock) => (
                            <button
                              key={stock.ticker}
                              type="button"
                              className={`heat-tile ${stockToneClass(stock.change)} ${stockSizeClass(stock.size)} ${
                                activeStock?.ticker === stock.ticker ? "selected" : ""
                              }`}
                              onClick={() => setSelectedTicker(stock.ticker)}
                            >
                              <span className="heat-ticker">{stock.ticker}</span>
                              <span className="heat-name">{stock.name}</span>
                              <span className="heat-sector">{stock.sector}</span>
                              <strong className="heat-change">
                                {stock.change > 0 ? "+" : ""}
                                {stock.change.toFixed(2)}%
                              </strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <aside className="news-panel">
                    {activeStock ? (
                      <>
                        <div className="news-header">
                          <div>
                            <p className="eyebrow">{activeStock.ticker}</p>
                            <h2>{activeStock.name}</h2>
                            <p className="news-subtitle">
                              Finviz-style frontend heatmap card for the selected region
                            </p>
                          </div>
                          <div className="sentiment-pill">{activeStock.sector}</div>
                        </div>

                        <div className="news-metrics">
                          <div className="metric-box">
                            <span>Region</span>
                            <strong>{activeStock.region}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Move</span>
                            <strong>
                              {activeStock.change > 0 ? "+" : ""}
                              {activeStock.change.toFixed(2)}%
                            </strong>
                          </div>
                        </div>

                        <div className="article-list">
                          {regionStocks.map((stock) => (
                            <button
                              key={stock.ticker}
                              type="button"
                              className={`article-card stock-list-card ${
                                stock.ticker === activeStock.ticker ? "stock-list-card-active" : ""
                              }`}
                              onClick={() => setSelectedTicker(stock.ticker)}
                            >
                              <div className="article-meta">
                                <span>{stock.sector}</span>
                                <span
                                  className="article-tone"
                                  style={{
                                    color:
                                      stock.change > 0.5
                                        ? "#86efac"
                                        : stock.change < -0.5
                                          ? "#fca5a5"
                                          : "#fde68a",
                                  }}
                                >
                                  {stock.change > 0 ? "+" : ""}
                                  {stock.change.toFixed(2)}%
                                </span>
                              </div>
                              <h3>
                                {stock.ticker} · {stock.name}
                              </h3>
                              <p>{stock.region} market heatmap block</p>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="state-card">No stock selected.</div>
                    )}
                  </aside>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
