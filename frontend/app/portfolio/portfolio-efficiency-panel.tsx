"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzePortfolioCml, sanitizePortfolioAssets, type PortfolioAssetInput } from "./cml";
import { DEFAULT_RISK_FREE_RATE } from "./cml-config";
import { fetchHistoricalCloseSeries, type HistoricalClosePoint } from "../stocks/stock-api";

type ProfilePreferences = {
  investmentGoal: string;
  investmentHorizon: string;
  riskAversion: number;
  occupation: string;
  monthlyCashFlowStability: string;
  lossTolerance: number;
};

type Props = {
  profilePreferences: ProfilePreferences;
};

const PORTFOLIO_FEATURED_TICKERS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSM",
  "ASML",
  "005930.KS",
  "EWJ",
  "EWY",
  "SPY",
  "VTI",
];

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatWeight(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSharpe(value: number) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function uniqueAssetTicker(inputs: PortfolioAssetInput[]) {
  return [...new Set(inputs.map((asset) => asset.ticker.trim().toUpperCase()).filter(Boolean))];
}

function cmlTooltipFormatter(value: number, label: string) {
  if (label === "Risk" || label === "Return") {
    return formatPercent(value);
  }
  return value.toFixed(2);
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

type ChartTooltipPayload = {
  risk: number;
  return: number;
  sharpe?: number;
  type?: string;
};

function PortfolioTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartTooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  return (
    <div className="portfolio-tooltip">
      <strong>{point.type ? point.type.replaceAll("_", " ") : "Portfolio point"}</strong>
      <span>Return: {formatPercent(point.return)}</span>
      <span>Risk: {formatPercent(point.risk)}</span>
      {typeof point.sharpe === "number" ? <span>Sharpe: {formatSharpe(point.sharpe)}</span> : null}
    </div>
  );
}

export default function PortfolioEfficiencyPanel({ profilePreferences }: Props) {
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetInput[]>([
    { ticker: "AAPL", weight: 25 },
    { ticker: "MSFT", weight: 25 },
    { ticker: "NVDA", weight: 25 },
    { ticker: "TSM", weight: 25 },
  ]);
  const [newTicker, setNewTicker] = useState("");
  const [priceHistoryCache, setPriceHistoryCache] = useState<Record<string, HistoricalClosePoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRandom, setShowRandom] = useState(true);
  const [showFrontier, setShowFrontier] = useState(true);
  const [showCml, setShowCml] = useState(true);

  const normalizedAssets = useMemo(() => sanitizePortfolioAssets(portfolioAssets), [portfolioAssets]);
  const uniqueTickers = useMemo(() => uniqueAssetTicker(portfolioAssets), [portfolioAssets]);

  useEffect(() => {
    const missingTickers = uniqueTickers.filter((ticker) => !priceHistoryCache[ticker]);
    if (!missingTickers.length) {
      return;
    }

    let cancelled = false;

    async function loadHistories() {
      try {
        setLoading(true);
        setError("");

        const entries = await Promise.all(
          missingTickers.map(async (ticker) => {
            try {
              const history = await fetchHistoricalCloseSeries(ticker);
              return [ticker, history] as const;
            } catch (fetchError) {
              return [ticker, []] as const;
            }
          }),
        );

        if (cancelled) return;

        setPriceHistoryCache((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));

        const failedTickers = entries.filter(([, history]) => history.length === 0).map(([ticker]) => ticker);
        if (failedTickers.length) {
          setError(`Some tickers could not load price history: ${failedTickers.join(", ")}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistories();

    return () => {
      cancelled = true;
    };
  }, [priceHistoryCache, uniqueTickers]);

  const analysis = useMemo(
    () => analyzePortfolioCml(normalizedAssets.assets, priceHistoryCache, { riskFreeRate: DEFAULT_RISK_FREE_RATE }),
    [normalizedAssets.assets, priceHistoryCache],
  );

  const chartSummary = analysis.summary;
  const tangencyWeights = analysis.tangencyPortfolio?.weights ?? {};

  function updateAsset(index: number, next: Partial<PortfolioAssetInput>) {
    setPortfolioAssets((current) =>
      current.map((asset, assetIndex) =>
        assetIndex === index
          ? {
              ...asset,
              ...next,
            }
          : asset,
      ),
    );
  }

  function addTicker(ticker: string) {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) return;

    setPortfolioAssets((current) => {
      if (current.some((asset) => asset.ticker.toUpperCase() === normalizedTicker)) {
        return current;
      }
      const equalWeight = current.length ? 100 / (current.length + 1) : 100;
      return [...current.map((asset) => ({ ...asset, weight: equalWeight })), { ticker: normalizedTicker, weight: equalWeight }];
    });
    setNewTicker("");
  }

  function removeTicker(index: number) {
    setPortfolioAssets((current) => current.filter((_, assetIndex) => assetIndex !== index));
  }

  return (
    <div className="portfolio-builder-shell">
      <div className="portfolio-builder-header">
        <div>
          <p className="eyebrow">PF view</p>
          <h2>Portfolio Efficiency (CML)</h2>
          <p className="portfolio-copy">
            Build a simple multi-asset portfolio, then see how its risk-return tradeoff compares with the efficient region.
          </p>
        </div>
        <div className="portfolio-header-chips">
          <span className="map-chip">1Y lookback</span>
          <span className="map-chip">Rf {formatPercent(DEFAULT_RISK_FREE_RATE)}</span>
        </div>
      </div>

      <div className="portfolio-builder-grid">
        <section className="portfolio-input-panel">
          <div className="portfolio-section-header">
            <strong>Portfolio inputs</strong>
            <span>Select tickers and assign weights.</span>
          </div>

          <div className="portfolio-asset-list">
            {portfolioAssets.map((asset, index) => (
              <div key={`${asset.ticker}-${index}`} className="portfolio-asset-row">
                <input
                  value={asset.ticker}
                  onChange={(event) => updateAsset(index, { ticker: event.target.value.toUpperCase() })}
                  placeholder="Ticker"
                />
                <input
                  type="number"
                  value={asset.weight}
                  onChange={(event) => updateAsset(index, { weight: Number(event.target.value) })}
                  min="0"
                  step="0.5"
                />
                <button type="button" className="portfolio-ghost-button" onClick={() => removeTicker(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="portfolio-add-row">
            <input
              value={newTicker}
              onChange={(event) => setNewTicker(event.target.value.toUpperCase())}
              placeholder="Add ticker"
            />
            <button type="button" className="portfolio-primary-button" onClick={() => addTicker(newTicker)}>
              Add
            </button>
          </div>

          <div className="portfolio-featured-row">
            {PORTFOLIO_FEATURED_TICKERS.map((ticker) => (
              <button key={ticker} type="button" className="portfolio-chip-button" onClick={() => addTicker(ticker)}>
                {ticker}
              </button>
            ))}
          </div>

          <div className="portfolio-input-note">
            <span>Total input weight</span>
            <strong>{normalizedAssets.inputWeightTotal.toFixed(1)}%</strong>
          </div>
          {chartSummary.weightsNormalized ? (
            <p className="portfolio-warning">Weights are normalized automatically for the analytics engine.</p>
          ) : null}
        </section>

        <aside className="portfolio-context-panel">
          <div className="portfolio-section-header">
            <strong>Investor context</strong>
            <span>Reusing the current profile inputs.</span>
          </div>

          <div className="portfolio-context-grid">
            <div className="portfolio-context-card">
              <span>Goal</span>
              <strong>{humanize(profilePreferences.investmentGoal)}</strong>
            </div>
            <div className="portfolio-context-card">
              <span>Horizon</span>
              <strong>{humanize(profilePreferences.investmentHorizon)}</strong>
            </div>
            <div className="portfolio-context-card">
              <span>Risk aversion</span>
              <strong>{profilePreferences.riskAversion}</strong>
            </div>
            <div className="portfolio-context-card">
              <span>Loss tolerance</span>
              <strong>{profilePreferences.lossTolerance}%</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="portfolio-toggle-row">
        <button
          type="button"
          className={`portfolio-toggle ${showRandom ? "active" : ""}`}
          onClick={() => setShowRandom((current) => !current)}
        >
          Show Random Portfolios
        </button>
        <button
          type="button"
          className={`portfolio-toggle ${showFrontier ? "active" : ""}`}
          onClick={() => setShowFrontier((current) => !current)}
        >
          Show Frontier
        </button>
        <button
          type="button"
          className={`portfolio-toggle ${showCml ? "active" : ""}`}
          onClick={() => setShowCml((current) => !current)}
        >
          Show CML
        </button>
      </div>

      {loading ? <div className="state-card">Loading price history for selected assets...</div> : null}
      {error ? <div className="state-card error-card">{error}</div> : null}
      {chartSummary.warnings.length ? (
        <div className="portfolio-warning-stack">
          {chartSummary.warnings.map((warning) => (
            <div key={warning} className="portfolio-warning-card">
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      <section className="portfolio-chart-card">
        <div className="portfolio-chart-header">
          <div>
            <span className="eyebrow">Portfolio Efficiency (CML)</span>
            <h3>Risk vs. expected return</h3>
          </div>
          <span className="map-chip">{chartSummary.alignedObservations} aligned daily returns</span>
        </div>

        <div className="portfolio-chart-shell">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis
                type="number"
                dataKey="risk"
                stroke="#7c8aa5"
                tickFormatter={(value) => formatPercent(Number(value))}
                domain={[0, "dataMax + 0.02"]}
              />
              <YAxis
                type="number"
                dataKey="return"
                stroke="#7c8aa5"
                tickFormatter={(value) => formatPercent(Number(value))}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<PortfolioTooltip />} />
              <Legend />

              {showRandom ? (
                <Scatter
                  name="Random portfolios"
                  data={analysis.randomPortfolios}
                  fill="rgba(148, 163, 184, 0.35)"
                />
              ) : null}

              {showFrontier ? (
                <Line
                  name="Efficient frontier"
                  data={analysis.efficientFrontier}
                  type="monotone"
                  dataKey="return"
                  stroke="#38bdf8"
                  strokeWidth={2.4}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}

              {showCml ? (
                <Line
                  name="Capital Market Line"
                  data={analysis.cml}
                  type="monotone"
                  dataKey="return"
                  stroke="#d9ff3f"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}

              <Scatter
                name="Risk-free"
                data={[analysis.riskFreePoint]}
                fill="#f8fafc"
                line={false}
              />

              {analysis.tangencyPortfolio ? (
                <Scatter
                  name="Tangency portfolio"
                  data={[{ ...analysis.tangencyPortfolio, type: "tangency" }]}
                  fill="#f59e0b"
                />
              ) : null}

              <Scatter
                name="Your portfolio"
                data={[{ ...analysis.userPortfolio, type: "user" }]}
                fill="#22c55e"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="portfolio-summary-grid">
        <div className="portfolio-summary-card">
          <span>Expected return</span>
          <strong>{formatPercent(analysis.userPortfolio.return)}</strong>
        </div>
        <div className="portfolio-summary-card">
          <span>Volatility</span>
          <strong>{formatPercent(analysis.userPortfolio.risk)}</strong>
        </div>
        <div className="portfolio-summary-card">
          <span>Sharpe ratio</span>
          <strong>{formatSharpe(analysis.userPortfolio.sharpe)}</strong>
        </div>
        <div className="portfolio-summary-card">
          <span>Risk-free rate</span>
          <strong>{formatPercent(chartSummary.riskFreeRate)}</strong>
        </div>
      </div>

      <div className="portfolio-interpretation-card">
        <span className="eyebrow">Interpretation</span>
        <h3>Beginner-friendly readout</h3>
        <p>{chartSummary.interpretation}</p>
      </div>

      {analysis.tangencyPortfolio ? (
        <div className="portfolio-tangency-card">
          <div className="portfolio-section-header">
            <strong>Tangency portfolio approximation</strong>
            <span>Best Sharpe portfolio from the random long-only simulation.</span>
          </div>
          <div className="portfolio-summary-grid">
            <div className="portfolio-summary-card">
              <span>Return</span>
              <strong>{formatPercent(analysis.tangencyPortfolio.return)}</strong>
            </div>
            <div className="portfolio-summary-card">
              <span>Risk</span>
              <strong>{formatPercent(analysis.tangencyPortfolio.risk)}</strong>
            </div>
            <div className="portfolio-summary-card">
              <span>Sharpe</span>
              <strong>{formatSharpe(analysis.tangencyPortfolio.sharpe)}</strong>
            </div>
          </div>

          <div className="portfolio-weight-chip-row">
            {Object.entries(tangencyWeights).map(([ticker, weight]) => (
              <div key={ticker} className="portfolio-weight-chip">
                <span>{ticker}</span>
                <strong>{formatWeight(weight * 100)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
