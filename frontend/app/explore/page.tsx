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
  articles: RegionArticle[];
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
  const [expandedGroup, setExpandedGroup] = useState<"ASIA" | "EU" | null>(null);
  const [selectedTicker, setSelectedTicker] = useState("ASML");
  const [selectedSector, setSelectedSector] = useState("Technology");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setExpandedGroup(null);
      return;
    }

    if (ASIA_DETAIL_REGIONS.includes(selectedRegion)) {
      setExpandedGroup("ASIA");
      return;
    }

    if (EU_DETAIL_REGIONS.includes(selectedRegion)) {
      setExpandedGroup("EU");
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
        .sort((a, b) => b.count - a.count),
      EU: DETAIL_REGIONS.EU.map((code) => mapRegionLookup.get(code))
        .filter((region): region is RegionSummary => Boolean(region))
        .sort((a, b) => b.count - a.count),
    }),
    [mapRegionLookup],
  );

  const visibleMapMarkers = useMemo(() => {
    const baseMarkers = BASE_REGIONS.map((code) => mapRegionLookup.get(code))
      .filter((region): region is RegionSummary => Boolean(region));

    if (!expandedGroup) {
      return baseMarkers;
    }

    return [...baseMarkers, ...detailRegionsByGroup[expandedGroup]];
  }, [mapRegionLookup, detailRegionsByGroup, expandedGroup]);

  const mapBubbleMetrics = useMemo(() => {
    const baseCaps = BASE_REGIONS.map((code) => ({
      region: code,
      marketCap: getRegionMarketCap(code),
    })).filter((item) => item.marketCap > 0);

    const detailCaps =
      expandedGroup === null
        ? []
        : detailRegionsByGroup[expandedGroup].map((region) => ({
            region: region.region,
            marketCap: getRegionMarketCap(region.region),
          }));

    const baseMin = Math.min(...baseCaps.map((item) => item.marketCap));
    const baseMax = Math.max(...baseCaps.map((item) => item.marketCap));
    const detailPositiveCaps = detailCaps.filter((item) => item.marketCap > 0);
    const detailMin = detailPositiveCaps.length
      ? Math.min(...detailPositiveCaps.map((item) => item.marketCap))
      : 0;
    const detailMax = detailPositiveCaps.length
      ? Math.max(...detailPositiveCaps.map((item) => item.marketCap))
      : 0;

    return new Map(
      visibleMapMarkers.map((region) => {
        const marketCap = getRegionMarketCap(region.region);
        const isBaseRegion = BASE_REGIONS.includes(region.region as BaseRegion);
        const size = isBaseRegion
          ? scaleBubbleSize(marketCap, baseMin, baseMax, 220, 420)
          : scaleBubbleSize(marketCap, detailMin, detailMax, 72, 152);

        return [
          region.region,
          {
            marketCap,
            size,
            isBaseRegion,
          },
        ];
      }),
    );
  }, [detailRegionsByGroup, expandedGroup, visibleMapMarkers]);

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

  function toggleGroup(group: "ASIA" | "EU") {
    const isExpanded = expandedGroup === group;
    if (isExpanded) {
      setExpandedGroup(null);
      setSelectedRegion(group);
      return;
    }

    setExpandedGroup(group);
    setSelectedRegion(group);
  }

  function selectRegion(region: RegionCode) {
    if (viewMode === "chart") {
      setExpandedGroup(null);
      setSelectedRegion(getParentRegion(region));
      return;
    }

    if (region === "ASIA" || region === "EU") {
      toggleGroup(region);
      return;
    }

    if (isAsiaFamily(region)) {
      setExpandedGroup("ASIA");
      setSelectedRegion(region);
      return;
    }

    if (isEuFamily(region)) {
      setExpandedGroup("EU");
      setSelectedRegion(region);
      return;
    }

    setExpandedGroup(null);
    setSelectedRegion(region);
  }

  function renderMapRegionTab(region: RegionSummary) {
    if (region.region !== "ASIA" && region.region !== "EU") {
      return (
        <button
          key={region.region}
          type="button"
          className={`region-tab ${region.region === selectedRegion ? "active" : ""}`}
          onClick={() => selectRegion(region.region)}
          style={{
            borderColor: region.region === selectedRegion ? region.color : "rgba(255,255,255,0.08)",
          }}
        >
          <span>{regionLabels[region.region]}</span>
          <strong>{region.count} articles</strong>
        </button>
      );
    }

    const group = region.region;
    const expanded = expandedGroup === group;
    const detailRegions = detailRegionsByGroup[group];

    return (
      <div key={`${group}-group`} className={`expandable-tab-group ${expanded ? "expanded" : ""}`}>
        <button
          type="button"
          className={`region-tab expandable-parent-tab ${
            region.region === selectedRegion ? "active" : ""
          } ${expanded ? "expanded" : ""}`}
          onClick={() => toggleGroup(group)}
          style={{
            borderColor: region.region === selectedRegion ? region.color : "rgba(255,255,255,0.08)",
          }}
        >
          <span>{regionLabels[region.region]}</span>
          <strong>{region.count} articles</strong>
          <span className={`expand-icon ${expanded ? "expanded" : ""}`}>›</span>
        </button>

        <div className={`region-subtabs ${expanded ? "expanded" : ""} ${group.toLowerCase()}-subtabs`}>
          {detailRegions.map((subregion) => (
            <button
              key={subregion.region}
              type="button"
              className={`region-tab region-subtab ${subregion.region === selectedRegion ? "active" : ""}`}
              onClick={() => selectRegion(subregion.region)}
              style={{
                borderColor:
                  subregion.region === selectedRegion ? subregion.color : "rgba(255,255,255,0.08)",
              }}
            >
              <span className="subtab-glow" />
              <span>{regionLabels[subregion.region]}</span>
              <strong>{subregion.count} articles</strong>
            </button>
          ))}
        </div>
      </div>
    );
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
                  : articleSortedRegions.map((region) => renderMapRegionTab(region))}
              </div>

              {viewMode === "map" ? (
                <div className="explore-grid">
                  <section className="map-panel">
                    <div className="map-header">
                      <div>
                        <p className="eyebrow">Map view</p>
                        <h2>Regional sentiment map</h2>
                      </div>
                      <div className="map-chip">{activeRegion?.region_name}</div>
                    </div>

                    <div className="map-stage">
                      {visibleMapMarkers.map((region) => {
                        const bubble = mapBubbleMetrics.get(region.region);
                        if (!bubble) {
                          return null;
                        }

                        return (
                          <div
                            key={`${region.region}-bubble`}
                            className={`map-bubble ${bubble.isBaseRegion ? "base-bubble" : "detail-bubble"} ${
                              region.region === selectedRegion ? "active" : ""
                            }`}
                            style={{
                              top: regionPositions[region.region].top,
                              left: regionPositions[region.region].left,
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

                      {visibleMapMarkers.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`map-marker ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => selectRegion(region.region)}
                          style={{
                            top: regionPositions[region.region].top,
                            left: regionPositions[region.region].left,
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
                      {(expandedGroup ? visibleMapMarkers : articleSortedRegions).map((region) => (
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
                            <p className="news-subtitle">
                              Related headlines from the current API response
                            </p>
                          </div>
                          <div className="sentiment-pill">{sentimentLabel(activeRegion.sentiment)}</div>
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
                            <span>Market cap</span>
                            <strong>{Math.round(getRegionMarketCap(activeRegion.region))}B</strong>
                          </div>
                          <div className="metric-box">
                            <span>Articles</span>
                            <strong>{activeRegion.count}</strong>
                          </div>
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
