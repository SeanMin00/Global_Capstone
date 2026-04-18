"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import {
  fetchBatchHistoricalCloseSeries,
  fetchRiskFreeRate,
  type HistoricalClosePoint,
  type RiskFreeRateResponse,
} from "../stocks/stock-api";

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

function ToggleHelp({ children }: { children: ReactNode }) {
  return (
    <span className="info-tooltip portfolio-toggle-help" tabIndex={0} onClick={(event) => event.stopPropagation()}>
      ?
      <span className="info-tooltip-card">{children}</span>
    </span>
  );
}

function CmlHelp() {
  return (
    <span className="info-tooltip portfolio-toggle-help" tabIndex={0} onClick={(event) => event.stopPropagation()}>
      ?
      <span className="info-tooltip-card portfolio-formula-card">
        <strong>Capital Market Line (CML)</strong>
        <span>
          It is straight because the app mixes the risk-free asset and one best Sharpe-ratio portfolio by changing only
          their weights.
        </span>
        <span className="portfolio-equation">
          <span>E(R</span>
          <sub>p</sub>
          <span>) = R</span>
          <sub>f</sub>
          <span> + </span>
          <span className="equation-fraction">
            <span>
              E(R<sub>m</sub>) - R<sub>f</sub>
            </span>
            <span>
              σ<sub>m</sub>
            </span>
          </span>
          <span> × σ</span>
          <sub>p</sub>
        </span>
        <span>Risk and expected return move proportionally as that mix changes.</span>
      </span>
    </span>
  );
}

function RandomPortfolioHelp() {
  return (
    <span className="info-tooltip portfolio-toggle-help" tabIndex={0} onClick={(event) => event.stopPropagation()}>
      ?
      <span className="info-tooltip-card portfolio-formula-card">
        <strong>Gray point (Random portfolio)</strong>
        <span>One portfolio made by randomly mixing the selected asset weights.</span>
        <span>Example</span>
        <code>A 50%, B 30%, C 20%</code>
        <code>A 10%, B 70%, C 20%</code>
        <code>A 40%, B 40%, C 20%</code>
      </span>
    </span>
  );
}

function AxisHelp({ type }: { type: "risk" | "return" }) {
  const isRisk = type === "risk";

  return (
    <span className="info-tooltip portfolio-axis-help" tabIndex={0}>
      ?
      <span className="info-tooltip-card portfolio-formula-card">
        {isRisk ? (
          <>
            <strong>Risk</strong>
            <span className="portfolio-equation">
              <span>σ</span>
              <sub>p</sub>
              <span> = √(w</span>
              <sup>T</sup>
              <span>Σw)</span>
            </span>
            <span>Σ: covariance matrix between assets.</span>
            <span>It reflects not only volatility, but also how assets move together.</span>
          </>
        ) : (
          <>
            <strong>Expected return</strong>
            <span className="portfolio-equation">
              <span>E(R</span>
              <sub>p</sub>
              <span>) = w</span>
              <sub>1</sub>
              <span>μ</span>
              <sub>1</sub>
              <span> + w</span>
              <sub>2</sub>
              <span>μ</span>
              <sub>2</sub>
              <span> + ... + w</span>
              <sub>n</sub>
              <span>μ</span>
              <sub>n</sub>
            </span>
            <span>wᵢ: asset weight</span>
            <span>μᵢ: average return of each asset</span>
          </>
        )}
      </span>
    </span>
  );
}

function RiskFreeRateHelp() {
  return (
    <span className="info-tooltip portfolio-axis-help" tabIndex={0}>
      ?
      <span className="info-tooltip-card portfolio-formula-card">
        <strong>Risk-free rate</strong>
        <span>Theoretical return from a zero-risk asset.</span>
        <span>Commonly proxied by short-term U.S. Treasury yields.</span>
        <span>On the chart, this is the point where risk = 0.</span>
        <span>It serves as the starting point of the Capital Market Line (CML).</span>
      </span>
    </span>
  );
}

export default function PortfolioEfficiencyPanel({ profilePreferences }: Props) {
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetInput[]>([
    { ticker: "AAPL", weight: 34 },
    { ticker: "MSFT", weight: 33 },
    { ticker: "SPY", weight: 33 },
  ]);
  const [newTicker, setNewTicker] = useState("");
  const [priceHistoryCache, setPriceHistoryCache] = useState<Record<string, HistoricalClosePoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRandom, setShowRandom] = useState(true);
  const [showFrontier, setShowFrontier] = useState(true);
  const [showCml, setShowCml] = useState(true);
  const [riskFreeRateInfo, setRiskFreeRateInfo] = useState<RiskFreeRateResponse | null>(null);
  const [riskFreeRateLoading, setRiskFreeRateLoading] = useState(false);

  const normalizedAssets = useMemo(() => sanitizePortfolioAssets(portfolioAssets), [portfolioAssets]);
  const uniqueTickers = useMemo(() => uniqueAssetTicker(portfolioAssets), [portfolioAssets]);
  const activeRiskFreeRate = riskFreeRateInfo?.rate ?? DEFAULT_RISK_FREE_RATE;

  useEffect(() => {
    let cancelled = false;

    async function loadRiskFreeRate() {
      try {
        setRiskFreeRateLoading(true);
        const payload = await fetchRiskFreeRate();
        if (!cancelled) {
          setRiskFreeRateInfo(payload);
        }
      } catch {
        if (!cancelled) {
          // If the official FRED fetch path is unavailable, the CML math keeps using
          // this single centralized fallback config instead of a hidden chart constant.
          setRiskFreeRateInfo({
            rate: DEFAULT_RISK_FREE_RATE,
            rate_percent: DEFAULT_RISK_FREE_RATE * 100,
            source: "FRED - 3-Month Treasury Constant Maturity (DGS3MO)",
            series_id: "DGS3MO",
            as_of: null,
            last_updated_timestamp: new Date().toISOString(),
            is_fallback: true,
            note: "Using fallback value. Risk-free rate API unavailable.",
          });
        }
      } finally {
        if (!cancelled) {
          setRiskFreeRateLoading(false);
        }
      }
    }

    loadRiskFreeRate();

    return () => {
      cancelled = true;
    };
  }, []);

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
        const batch = await fetchBatchHistoricalCloseSeries(missingTickers);
        const entries = missingTickers.map((ticker) => [ticker, batch.data[ticker] ?? []] as const);

        if (cancelled) return;

        setPriceHistoryCache((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));

        const failedTickers = entries.filter(([, history]) => history.length === 0).map(([ticker]) => ticker);
        if (failedTickers.length) {
          setError(`Some tickers could not load price history: ${failedTickers.join(", ")}`);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Portfolio price history could not be loaded right now.";
          setError(message);
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
    // The fetched DGS3MO risk-free proxy enters Sharpe ratio and CML calculations here.
    () => analyzePortfolioCml(normalizedAssets.assets, priceHistoryCache, { riskFreeRate: activeRiskFreeRate }),
    [activeRiskFreeRate, normalizedAssets.assets, priceHistoryCache],
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
          <span className="map-chip">Rf {formatPercent(activeRiskFreeRate)}</span>
        </div>
      </div>

      <div className="portfolio-builder-grid">
        <section className="portfolio-input-panel">
          <div className="portfolio-section-header">
            <div>
              <strong>Portfolio inputs</strong>
              <span>Select tickers and assign weights.</span>
            </div>
            <strong className="portfolio-section-total">{normalizedAssets.inputWeightTotal.toFixed(1)}%</strong>
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

        <div className="portfolio-side-stack">
          <aside className="portfolio-context-panel">
            <div className="portfolio-section-header">
              <div>
                <strong>Investor context</strong>
                <span>Reusing the current profile inputs.</span>
              </div>
            </div>

            <div className="portfolio-context-grid">
              <div className="portfolio-context-card portfolio-context-card-wide">
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
              <div className="portfolio-context-card portfolio-context-card-wide">
                <span>Loss tolerance</span>
                <strong>{profilePreferences.lossTolerance}%</strong>
              </div>
            </div>
          </aside>

          <aside className="portfolio-context-panel portfolio-analysis-panel">
            <div className="portfolio-section-header">
              <div>
                <strong>Analysis settings</strong>
                <span>Select the layers to display on the chart.</span>
              </div>
            </div>

            <div className="portfolio-analysis-options">
              <button
                type="button"
                className={`portfolio-toggle ${showRandom ? "active" : ""}`}
                onClick={() => setShowRandom((current) => !current)}
              >
                <span>Show Random Portfolios</span>
                <RandomPortfolioHelp />
              </button>
              <button
                type="button"
                className={`portfolio-toggle ${showFrontier ? "active" : ""}`}
                onClick={() => setShowFrontier((current) => !current)}
              >
                <span>Show Frontier</span>
                <ToggleHelp>
                  The frontier highlights the best simulated portfolios for each risk level. Points below it may be taking
                  more risk than needed for their expected return.
                </ToggleHelp>
              </button>
              <button
                type="button"
                className={`portfolio-toggle ${showCml ? "active" : ""}`}
                onClick={() => setShowCml((current) => !current)}
              >
                <span>Show CML</span>
                <CmlHelp />
              </button>
            </div>

            <div className="portfolio-analysis-footer">
              <span>Lookback: 1Y</span>
              <span>Risk-free rate: {formatPercent(activeRiskFreeRate)}</span>
            </div>
          </aside>
        </div>
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

        <div className="portfolio-chart-shell" data-tour="pf-cml-chart">
          <div className="portfolio-axis-guide portfolio-axis-guide-top">
            <div>
              <span>Y-axis</span>
              <strong>Expected return</strong>
              <AxisHelp type="return" />
            </div>
          </div>
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
          <div className="portfolio-axis-guide portfolio-axis-guide-bottom">
            <div>
              <span>X-axis</span>
              <strong>Risk</strong>
              <AxisHelp type="risk" />
            </div>
          </div>
        </div>
      </section>

      <section className="portfolio-bottom-grid">
        <div className="portfolio-summary-panel">
          <span className="eyebrow">My portfolio</span>
          <div className="portfolio-summary-stack">
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
          </div>
        </div>

        <div className="portfolio-summary-panel">
          <span className="eyebrow">Tangency portfolio</span>
          {analysis.tangencyPortfolio ? (
            <div className="portfolio-summary-stack">
              <div className="portfolio-summary-card">
                <span>Expected return</span>
                <strong>{formatPercent(analysis.tangencyPortfolio.return)}</strong>
              </div>
              <div className="portfolio-summary-card">
                <span>Volatility</span>
                <strong>{formatPercent(analysis.tangencyPortfolio.risk)}</strong>
              </div>
              <div className="portfolio-summary-card">
                <span>Sharpe ratio</span>
                <strong>{formatSharpe(analysis.tangencyPortfolio.sharpe)}</strong>
              </div>
            </div>
          ) : (
            <div className="portfolio-summary-card">
              <span>Status</span>
              <strong>Not available</strong>
            </div>
          )}
        </div>

        <div className="portfolio-summary-panel">
          <span className="eyebrow">Benchmarks</span>
          <div className="portfolio-summary-stack">
            <div className="portfolio-summary-card">
              <span className="portfolio-summary-label">
                Risk-free rate
                <RiskFreeRateHelp />
              </span>
              <strong>{formatPercent(chartSummary.riskFreeRate)}</strong>
              <small>
                {riskFreeRateInfo?.source ?? "FRED - 3-Month Treasury Constant Maturity (DGS3MO)"}
                {riskFreeRateInfo?.as_of ? ` · ${riskFreeRateInfo.as_of}` : " · Using fallback value"}
              </small>
            </div>
            <div className="portfolio-summary-card">
              <span>Tangency weights</span>
              <div className="portfolio-weight-chip-row">
                {Object.entries(tangencyWeights).map(([ticker, weight]) => (
                  <div key={ticker} className="portfolio-weight-chip">
                    <span>{ticker}</span>
                    <strong>{formatWeight(weight * 100)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="portfolio-interpretation-card">
          <span className="eyebrow">Interpretation</span>
          <h3>Beginner-friendly readout</h3>
          <p>{chartSummary.interpretation}</p>
        </div>
      </section>
    </div>
  );
}
