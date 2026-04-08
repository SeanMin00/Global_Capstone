"use client";

import { useEffect, useMemo, useState } from "react";

type RegionArticle = {
  title: string;
  source: string;
  url: string;
  sentiment: number;
};

type RegionSummary = {
  region: "US" | "EU" | "ASIA";
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
  region: RegionSummary["region"];
  change: number;
  marketCap: number;
  size: "lg" | "md" | "sm";
};

const regionPositions: Record<RegionSummary["region"], { top: string; left: string }> = {
  US: { top: "42%", left: "24%" },
  EU: { top: "33%", left: "53%" },
  ASIA: { top: "45%", left: "77%" },
};

const heatmapStocks: HeatmapStock[] = [
  { ticker: "AAPL", name: "Apple", sector: "Technology", region: "US", change: 1.42, marketCap: 2950, size: "lg" },
  { ticker: "MSFT", name: "Microsoft", sector: "Technology", region: "US", change: 2.14, marketCap: 3150, size: "lg" },
  { ticker: "NVDA", name: "NVIDIA", sector: "Technology", region: "US", change: 3.28, marketCap: 2650, size: "lg" },
  { ticker: "JPM", name: "JPMorgan", sector: "Financial", region: "US", change: -0.74, marketCap: 620, size: "md" },
  { ticker: "XOM", name: "Exxon", sector: "Energy", region: "US", change: -1.81, marketCap: 510, size: "md" },
  { ticker: "SAP", name: "SAP", sector: "Technology", region: "EU", change: 1.26, marketCap: 250, size: "lg" },
  { ticker: "ASML", name: "ASML", sector: "Technology", region: "EU", change: 2.02, marketCap: 390, size: "lg" },
  { ticker: "SIE", name: "Siemens", sector: "Industrials", region: "EU", change: -0.62, marketCap: 150, size: "md" },
  { ticker: "MC", name: "LVMH", sector: "Consumer Cyclical", region: "EU", change: 0.41, marketCap: 360, size: "md" },
  { ticker: "BP", name: "BP", sector: "Energy", region: "EU", change: -1.22, marketCap: 120, size: "sm" },
  { ticker: "TSM", name: "TSMC", sector: "Technology", region: "ASIA", change: 2.84, marketCap: 890, size: "lg" },
  { ticker: "SONY", name: "Sony", sector: "Consumer Cyclical", region: "ASIA", change: 0.93, marketCap: 150, size: "md" },
  { ticker: "BABA", name: "Alibaba", sector: "Consumer Cyclical", region: "ASIA", change: -2.17, marketCap: 210, size: "lg" },
  { ticker: "005930", name: "Samsung", sector: "Technology", region: "ASIA", change: 1.73, marketCap: 420, size: "lg" },
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
  { ticker: "LIN", name: "Linde", sector: "Basic Materials", region: "EU", change: 0.96, marketCap: 210, size: "md" },
  { ticker: "RIO", name: "Rio Tinto", sector: "Basic Materials", region: "EU", change: -1.09, marketCap: 115, size: "md" },
  { ticker: "BNP", name: "BNP Paribas", sector: "Financial", region: "EU", change: -0.34, marketCap: 90, size: "md" },
  { ticker: "ADS", name: "Adidas", sector: "Consumer Cyclical", region: "EU", change: 0.67, marketCap: 45, size: "sm" },
  { ticker: "NESN", name: "Nestle", sector: "Consumer Defensive", region: "EU", change: -0.22, marketCap: 310, size: "sm" },
  { ticker: "NVO", name: "Novo Nordisk", sector: "Healthcare", region: "EU", change: 1.81, marketCap: 570, size: "lg" },
  { ticker: "ENEL", name: "Enel", sector: "Utilities", region: "EU", change: 0.12, marketCap: 70, size: "sm" },
  { ticker: "SU", name: "Schneider", sector: "Industrials", region: "EU", change: 0.58, marketCap: 130, size: "sm" },
  { ticker: "REL", name: "Relx", sector: "Communication Services", region: "EU", change: 0.35, marketCap: 78, size: "sm" },
  { ticker: "AIR", name: "Airbus", sector: "Industrials", region: "EU", change: -0.87, marketCap: 120, size: "md" },
  { ticker: "PTR", name: "PetroChina", sector: "Energy", region: "ASIA", change: 0.66, marketCap: 165, size: "md" },
  { ticker: "7203", name: "Toyota", sector: "Consumer Cyclical", region: "ASIA", change: 1.06, marketCap: 320, size: "lg" },
  { ticker: "9984", name: "SoftBank", sector: "Communication Services", region: "ASIA", change: -0.93, marketCap: 95, size: "md" },
  { ticker: "6861", name: "Keyence", sector: "Technology", region: "ASIA", change: 1.24, marketCap: 130, size: "md" },
  { ticker: "1398", name: "ICBC", sector: "Financial", region: "ASIA", change: 0.28, marketCap: 220, size: "sm" },
  { ticker: "KHC", name: "Hengan", sector: "Consumer Defensive", region: "ASIA", change: -0.14, marketCap: 35, size: "sm" },
  { ticker: "2317", name: "Foxconn", sector: "Industrials", region: "ASIA", change: 0.77, marketCap: 85, size: "md" },
  { ticker: "0883", name: "CNOOC", sector: "Energy", region: "ASIA", change: -1.36, marketCap: 145, size: "sm" },
  { ticker: "3988", name: "Bank of China", sector: "Financial", region: "ASIA", change: 0.18, marketCap: 150, size: "sm" },
  { ticker: "9618", name: "JD.com", sector: "Consumer Cyclical", region: "ASIA", change: -1.11, marketCap: 55, size: "md" },
  { ticker: "HMC", name: "Honda", sector: "Consumer Cyclical", region: "ASIA", change: 0.54, marketCap: 55, size: "sm" },
  { ticker: "4704", name: "Trend Micro", sector: "Technology", region: "ASIA", change: 0.49, marketCap: 35, size: "sm" },
  { ticker: "TCL", name: "TCL Zhonghuan", sector: "Basic Materials", region: "ASIA", change: -0.43, marketCap: 24, size: "sm" },
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

function getRegionMarketCap(region: RegionSummary["region"]) {
  return heatmapStocks
    .filter((stock) => stock.region === region)
    .reduce((sum, stock) => sum + stock.marketCap, 0);
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

export default function ExplorePage() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionSummary["region"]>("EU");
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
        const topMarketRegion = [...payload].sort(
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

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
    [regions],
  );

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
                {sortedRegions.map((region) => (
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
                    <span>{region.region}</span>
                    <strong>{Math.round(getRegionMarketCap(region.region))}B mcap</strong>
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
                      <div className="map-chip">{activeRegion?.region_name}</div>
                    </div>

                    <div className="map-stage">
                      <div
                        className="map-shape north-america"
                        style={{
                          background:
                            activeRegion?.region === "US"
                              ? sentimentBackground(activeRegion.sentiment)
                              : "rgba(56, 189, 248, 0.14)",
                        }}
                      />
                      <div
                        className="map-shape europe"
                        style={{
                          background:
                            activeRegion?.region === "EU"
                              ? sentimentBackground(activeRegion.sentiment)
                              : "rgba(56, 189, 248, 0.14)",
                        }}
                      />
                      <div
                        className="map-shape asia"
                        style={{
                          background:
                            activeRegion?.region === "ASIA"
                              ? sentimentBackground(activeRegion.sentiment)
                              : "rgba(56, 189, 248, 0.14)",
                        }}
                      />

                      {regions.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`map-marker ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => setSelectedRegion(region.region)}
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
                            <strong>{region.region}</strong>
                            <small>{sentimentLabel(region.sentiment)}</small>
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="bottom-summary">
                      {sortedRegions.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`summary-card ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => setSelectedRegion(region.region)}
                        >
                          <span>{region.region_name}</span>
                          <strong>
                            Sentiment: {region.sentiment.toFixed(2)} ({region.count})
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
