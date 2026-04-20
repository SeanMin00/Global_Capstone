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
  fetchCapmAnalysis,
  fetchBatchHistoricalCloseSeries,
  fetchRiskFreeRate,
  type CapmAnalyzeResponse,
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

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function covariance(valuesA: number[], valuesB: number[]) {
  if (valuesA.length < 2 || valuesB.length < 2) return 0;
  const meanA = mean(valuesA);
  const meanB = mean(valuesB);
  let total = 0;
  for (let index = 0; index < valuesA.length; index += 1) {
    total += (valuesA[index] - meanA) * (valuesB[index] - meanB);
  }
  return total / (valuesA.length - 1);
}

function formatSignedPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function formatSignedNumber(value: number, digits = 2) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}

function formatPercent1(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function betaTone(value: number) {
  if (value >= 1.15) return "Above-market sensitivity";
  if (value <= 0.85) return "Below-market sensitivity";
  return "Balanced with the market";
}

function capmInterpretation(payload: CapmAnalyzeResponse | null) {
  if (!payload) return "Open CAPM analysis to compare your return outlook with the market-required return.";
  if (payload.alpha >= 0.04) {
    return "This portfolio is earning meaningfully more than the CAPM baseline, so it looks strong relative to its market beta.";
  }
  if (payload.alpha >= 0) {
    return "This portfolio is slightly above the CAPM baseline, which suggests the current return outlook is holding up well for its beta.";
  }
  if (payload.alpha <= -0.04) {
    return "This portfolio is trailing the CAPM baseline by a visible margin, so the return outlook may be weak for the market risk it takes.";
  }
  return "This portfolio is close to the CAPM baseline, so it is behaving roughly in line with its market sensitivity.";
}

function buildFallbackCapmAnalysis(params: {
  assets: PortfolioAssetInput[];
  priceHistoryCache: Record<string, HistoricalClosePoint[]>;
  riskFreeRateInfo: RiskFreeRateResponse | null;
  userPortfolio: { risk: number; return: number; sharpe: number };
}) {
  const { assets, priceHistoryCache, riskFreeRateInfo, userPortfolio } = params;
  const benchmarkTicker = "SPY";
  const normalizedAssets = sanitizePortfolioAssets(assets).assets;
  const portfolioAssets = normalizedAssets.filter((asset) => (priceHistoryCache[asset.ticker] ?? []).length > 0);
  const benchmarkSeries = priceHistoryCache[benchmarkTicker] ?? [];

  if (!portfolioAssets.length || benchmarkSeries.length < 30) {
    return null;
  }

  const tickers = [...portfolioAssets.map((asset) => asset.ticker), benchmarkTicker];
  const dateSets = tickers.map((ticker) => new Set((priceHistoryCache[ticker] ?? []).map((point) => point.date)));
  const overlappingDates = [...dateSets[0]].filter((date) => dateSets.every((set) => set.has(date))).sort();
  if (overlappingDates.length < 31) {
    return null;
  }

  const alignedPrices = tickers.map((ticker) => {
    const series = priceHistoryCache[ticker] ?? [];
    const priceMap = new Map(series.map((point) => [point.date, point.close]));
    return overlappingDates.map((date) => priceMap.get(date) ?? null);
  });

  const returnMatrix: number[][] = [];
  for (let index = 1; index < overlappingDates.length; index += 1) {
    const row = alignedPrices.map((prices) => {
      const previous = prices[index - 1];
      const current = prices[index];
      if (previous === null || current === null || previous <= 0 || current <= 0) {
        return Number.NaN;
      }
      return current / previous - 1;
    });
    if (!row.some((value) => Number.isNaN(value))) {
      returnMatrix.push(row);
    }
  }

  if (returnMatrix.length < 30) {
    return null;
  }

  const benchmarkReturns = returnMatrix.map((row) => row[row.length - 1]);
  const portfolioReturns = returnMatrix.map((row) =>
    row.slice(0, portfolioAssets.length).reduce((sum, assetReturn, index) => sum + assetReturn * portfolioAssets[index].weight, 0),
  );

  const riskFreeRate = riskFreeRateInfo?.rate ?? DEFAULT_RISK_FREE_RATE;
  const benchmarkReturn = mean(benchmarkReturns) * 252;
  const benchmarkVariance = covariance(benchmarkReturns, benchmarkReturns);
  const beta = benchmarkVariance > 0 ? covariance(portfolioReturns, benchmarkReturns) / benchmarkVariance : 0;
  const capmExpectedReturn = riskFreeRate + beta * (benchmarkReturn - riskFreeRate);
  const alpha = userPortfolio.return - capmExpectedReturn;

  return {
    benchmark_ticker: benchmarkTicker,
    aligned_observations: returnMatrix.length,
    portfolio_return: userPortfolio.return,
    portfolio_volatility: userPortfolio.risk,
    portfolio_sharpe: userPortfolio.sharpe,
    benchmark_return: benchmarkReturn,
    beta,
    capm_expected_return: capmExpectedReturn,
    alpha,
    risk_free_rate: riskFreeRate,
    risk_free_rate_info:
      riskFreeRateInfo ?? {
        rate: DEFAULT_RISK_FREE_RATE,
        rate_percent: DEFAULT_RISK_FREE_RATE * 100,
        source: "FRED - 3-Month Treasury Constant Maturity (DGS3MO)",
        series_id: "DGS3MO",
        as_of: null,
        last_updated_timestamp: new Date().toISOString(),
        is_fallback: true,
        note: "Using fallback value.",
      },
    weights: Object.fromEntries(portfolioAssets.map((asset) => [asset.ticker, Number(asset.weight.toFixed(4))])),
  } satisfies CapmAnalyzeResponse;
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
  const [capmOpen, setCapmOpen] = useState(false);
  const [capmLoading, setCapmLoading] = useState(false);
  const [capmError, setCapmError] = useState("");
  const [capmAnalysis, setCapmAnalysis] = useState<CapmAnalyzeResponse | null>(null);
  const [simulatedReturn, setSimulatedReturn] = useState(0);
  const [simulatedBeta, setSimulatedBeta] = useState(1);

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
  const tangencyComparison = analysis.tangencyPortfolio;
  const userWinsReturn = tangencyComparison ? analysis.userPortfolio.return > tangencyComparison.return : false;
  const userWinsVolatility = tangencyComparison ? analysis.userPortfolio.risk < tangencyComparison.risk : false;
  const userWinsSharpe = tangencyComparison ? analysis.userPortfolio.sharpe > tangencyComparison.sharpe : false;

  useEffect(() => {
    if (!capmAnalysis) return;
    setSimulatedReturn(capmAnalysis.portfolio_return);
    setSimulatedBeta(capmAnalysis.beta);
  }, [capmAnalysis]);

  useEffect(() => {
    if (!capmOpen || normalizedAssets.assets.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadCapm() {
      try {
        setCapmLoading(true);
        setCapmError("");
        const payload = await fetchCapmAnalysis({
          assets: portfolioAssets.map((asset) => ({
            ticker: asset.ticker,
            weight: asset.weight,
          })),
          benchmark_ticker: "SPY",
        });
        if (!cancelled) {
          setCapmAnalysis(payload);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const fallback = buildFallbackCapmAnalysis({
            assets: portfolioAssets,
            priceHistoryCache,
            riskFreeRateInfo,
            userPortfolio: analysis.userPortfolio,
          });
          if (fallback) {
            setCapmAnalysis(fallback);
            setCapmError("");
          } else {
            setCapmAnalysis(null);
            setCapmError(
              fetchError instanceof Error
                ? fetchError.message
                : "CAPM analysis could not be loaded right now.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setCapmLoading(false);
        }
      }
    }

    loadCapm();

    return () => {
      cancelled = true;
    };
  }, [analysis.userPortfolio, capmOpen, normalizedAssets.assets, portfolioAssets, priceHistoryCache, riskFreeRateInfo]);

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

  const capmReturnBars = capmAnalysis
    ? [
        { label: "Risk-free", value: capmAnalysis.risk_free_rate, tone: "riskfree" },
        { label: "Market", value: capmAnalysis.benchmark_return, tone: "market" },
        { label: "CAPM required", value: capmAnalysis.capm_expected_return, tone: "capm" },
        { label: "Your portfolio", value: capmAnalysis.portfolio_return, tone: "user" },
      ]
    : [];
  const capmReturnBarMax = capmReturnBars.length ? Math.max(...capmReturnBars.map((item) => item.value), 0.01) : 0.01;
  const simulationCapmReturn = capmAnalysis
    ? capmAnalysis.risk_free_rate + simulatedBeta * (capmAnalysis.benchmark_return - capmAnalysis.risk_free_rate)
    : 0;
  const simulationAlpha = simulatedReturn - simulationCapmReturn;
  const returnSliderMax = capmAnalysis
    ? Math.max(capmAnalysis.portfolio_return, capmAnalysis.capm_expected_return, capmAnalysis.benchmark_return, 0.45)
    : 0.45;

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
        <section className="portfolio-input-panel" data-tour="pf-input-panel">
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
                <div className="portfolio-asset-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <label className="portfolio-asset-field portfolio-asset-ticker-field portfolio-asset-cell">
                  <span className="portfolio-asset-label">Ticker</span>
                  <input
                    value={asset.ticker}
                    onChange={(event) => updateAsset(index, { ticker: event.target.value.toUpperCase() })}
                    placeholder="Ticker"
                  />
                </label>
                <label className="portfolio-asset-field portfolio-asset-weight-field portfolio-asset-cell">
                  <span className="portfolio-asset-label">Weight (%)</span>
                  <div className="portfolio-weight-input-wrap">
                    <input
                      type="number"
                      value={asset.weight}
                      onChange={(event) => updateAsset(index, { weight: Number(event.target.value) })}
                      min="0"
                      step="0.5"
                    />
                    <span className="portfolio-weight-unit">%</span>
                  </div>
                </label>
                <div className="portfolio-asset-action portfolio-asset-cell">
                  <button type="button" className="portfolio-ghost-button" onClick={() => removeTicker(index)}>
                    Remove
                  </button>
                </div>
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
              <div className={`portfolio-check-row ${showRandom ? "active" : ""}`}>
                <label className="portfolio-check-main">
                  <input
                    type="checkbox"
                    checked={showRandom}
                    onChange={(event) => setShowRandom(event.target.checked)}
                  />
                  <span className="portfolio-check-box" aria-hidden="true">
                    {showRandom ? "✓" : ""}
                  </span>
                  <span>Show Random Portfolios</span>
                </label>
                <RandomPortfolioHelp />
              </div>
              <div className={`portfolio-check-row ${showFrontier ? "active" : ""}`}>
                <label className="portfolio-check-main">
                  <input
                    type="checkbox"
                    checked={showFrontier}
                    onChange={(event) => setShowFrontier(event.target.checked)}
                  />
                  <span className="portfolio-check-box" aria-hidden="true">
                    {showFrontier ? "✓" : ""}
                  </span>
                  <span>Show Frontier</span>
                </label>
                <ToggleHelp>
                  The frontier highlights the best simulated portfolios for each risk level. Points below it may be taking
                  more risk than needed for their expected return.
                </ToggleHelp>
              </div>
              <div className={`portfolio-check-row ${showCml ? "active" : ""}`}>
                <label className="portfolio-check-main">
                  <input
                    type="checkbox"
                    checked={showCml}
                    onChange={(event) => setShowCml(event.target.checked)}
                  />
                  <span className="portfolio-check-box" aria-hidden="true">
                    {showCml ? "✓" : ""}
                  </span>
                  <span>Show CML</span>
                </label>
                <CmlHelp />
              </div>
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
        <div className="portfolio-compare-group" data-tour="pf-portfolio-compare">
          <div className="portfolio-summary-panel">
            <span className="eyebrow">My portfolio</span>
            <div className="portfolio-summary-card portfolio-stacked-metrics-card">
              <div className="portfolio-stacked-metric-row">
                <span>Expected return</span>
                <strong className={userWinsReturn ? "portfolio-metric-winner" : undefined}>
                  {formatPercent(analysis.userPortfolio.return)}
                </strong>
              </div>
              <div className="portfolio-stacked-metric-row">
                <span>Volatility</span>
                <strong className={userWinsVolatility ? "portfolio-metric-winner" : undefined}>
                  {formatPercent(analysis.userPortfolio.risk)}
                </strong>
              </div>
              <div className="portfolio-stacked-metric-row">
                <span>Sharpe ratio</span>
                <strong className={userWinsSharpe ? "portfolio-metric-winner" : undefined}>
                  {formatSharpe(analysis.userPortfolio.sharpe)}
                </strong>
              </div>
            </div>
          </div>

          <div className="portfolio-summary-panel">
            <span className="eyebrow">Tangency portfolio</span>
            {analysis.tangencyPortfolio ? (
              <div className="portfolio-summary-card portfolio-stacked-metrics-card">
                <div className="portfolio-stacked-metric-row">
                  <span>Expected return</span>
                  <strong className={!userWinsReturn ? "portfolio-metric-winner" : undefined}>
                    {formatPercent(analysis.tangencyPortfolio.return)}
                  </strong>
                </div>
                <div className="portfolio-stacked-metric-row">
                  <span>Volatility</span>
                  <strong className={!userWinsVolatility ? "portfolio-metric-winner" : undefined}>
                    {formatPercent(analysis.tangencyPortfolio.risk)}
                  </strong>
                </div>
                <div className="portfolio-stacked-metric-row">
                  <span>Sharpe ratio</span>
                  <strong className={!userWinsSharpe ? "portfolio-metric-winner" : undefined}>
                    {formatSharpe(analysis.tangencyPortfolio.sharpe)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="portfolio-summary-card">
                <span>Status</span>
                <strong>Not available</strong>
              </div>
            )}
          </div>
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

        <div className="portfolio-interpretation-card" data-tour="pf-beginner-readout">
          <span className="eyebrow">Interpretation</span>
          <h3>Beginner-friendly readout</h3>
          <p>{chartSummary.interpretation}</p>
          <button type="button" className="portfolio-capm-inline-trigger" onClick={() => setCapmOpen(true)}>
            CAPM analysis
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <div className={`portfolio-capm-shell ${capmOpen ? "open" : ""}`} aria-hidden={!capmOpen}>
        <button
          type="button"
          className="portfolio-capm-backdrop"
          aria-label="Close CAPM analysis"
          onClick={() => setCapmOpen(false)}
        />
        <aside className="portfolio-capm-panel">
          <div className="portfolio-capm-header">
            <div>
              <span className="eyebrow">CAPM analysis</span>
              <h3>Market-risk based readout</h3>
              <p>Compare your current portfolio return with the return implied by beta and the market benchmark.</p>
            </div>
            <button
              type="button"
              className="portfolio-capm-close"
              aria-label="Close CAPM analysis"
              onClick={() => setCapmOpen(false)}
            >
              ×
            </button>
          </div>

          {capmLoading ? <div className="state-card">Loading CAPM analysis...</div> : null}
          {capmError ? <div className="state-card error-card">{capmError}</div> : null}

          {capmAnalysis ? (
            <div className="portfolio-capm-body">
              <section className="portfolio-capm-card portfolio-capm-hero">
                <span className="eyebrow">Alpha gap (annual)</span>
                <strong className={capmAnalysis.alpha >= 0 ? "positive" : "negative"}>
                  {formatSignedPercent(capmAnalysis.alpha)}
                </strong>
                <p>{capmInterpretation(capmAnalysis)}</p>
              </section>

              <section className="portfolio-capm-card">
                <span className="portfolio-capm-card-label">Return comparison</span>
                <div className="portfolio-capm-column-chart">
                  {capmReturnBars.map((bar) => (
                    <div key={bar.label} className="portfolio-capm-column-item">
                      <strong className={`portfolio-capm-column-value ${bar.tone}`}>{formatPercent1(bar.value)}</strong>
                      <div className="portfolio-capm-column-track">
                        <div
                          className={`portfolio-capm-column-bar ${bar.tone}`}
                          style={{ height: `${Math.max((bar.value / capmReturnBarMax) * 100, 8)}%` }}
                        />
                      </div>
                      <span className="portfolio-capm-column-label">{bar.label}</span>
                    </div>
                  ))}
                </div>
                <small className="portfolio-capm-footnote">
                  CAPM = Rf + β × (Rm - Rf)
                </small>
              </section>

              <section className="portfolio-capm-card">
                <span className="portfolio-capm-card-label">Market sensitivity (beta)</span>
                <div className="portfolio-capm-beta-row">
                  <strong>{capmAnalysis.beta.toFixed(2)}</strong>
                  <span className="portfolio-capm-badge">{betaTone(capmAnalysis.beta)}</span>
                </div>
                <div className="portfolio-capm-meter">
                  <div className="portfolio-capm-meter-scale">
                    <span>Low 0.5</span>
                    <span>Market 1.0</span>
                    <span>High 2.0</span>
                  </div>
                  <div className="portfolio-capm-meter-track">
                    <div
                      className="portfolio-capm-meter-thumb"
                      style={{ left: `${Math.max(0, Math.min((capmAnalysis.beta / 2) * 100, 100))}%` }}
                    />
                  </div>
                </div>
                <p>
                  When the market moves 10%, this portfolio is estimated to move about{" "}
                  <strong className="portfolio-capm-inline-positive">{formatSignedPercent(capmAnalysis.beta * 0.1)}</strong>{" "}
                  on the upside, and about{" "}
                  <strong className="portfolio-capm-inline-negative">-{(capmAnalysis.beta * 10).toFixed(1)}%</strong>{" "}
                  on the downside.
                </p>
              </section>

              <section className="portfolio-capm-card">
                <span className="portfolio-capm-card-label">Key metric summary</span>
                <div className="portfolio-capm-summary-rows">
                  <div className="portfolio-capm-summary-row">
                    <span>Expected return</span>
                    <div className="portfolio-capm-summary-track"><div style={{ width: `${Math.min(capmAnalysis.portfolio_return * 100, 100)}%` }} /></div>
                    <strong>{formatPercent(capmAnalysis.portfolio_return)}</strong>
                  </div>
                  <div className="portfolio-capm-summary-row">
                    <span>CAPM required</span>
                    <div className="portfolio-capm-summary-track"><div className="capm" style={{ width: `${Math.min(capmAnalysis.capm_expected_return * 100, 100)}%` }} /></div>
                    <strong>{formatPercent(capmAnalysis.capm_expected_return)}</strong>
                  </div>
                  <div className="portfolio-capm-summary-row">
                    <span>Alpha</span>
                    <div className="portfolio-capm-summary-track"><div className={capmAnalysis.alpha >= 0 ? "positive" : "negative"} style={{ width: `${Math.min(Math.abs(capmAnalysis.alpha) * 400, 100)}%` }} /></div>
                    <strong>{formatSignedPercent(capmAnalysis.alpha)}</strong>
                  </div>
                  <div className="portfolio-capm-summary-row">
                    <span>Beta</span>
                    <div className="portfolio-capm-summary-track"><div className="beta" style={{ width: `${Math.min((capmAnalysis.beta / 2) * 100, 100)}%` }} /></div>
                    <strong>{capmAnalysis.beta.toFixed(2)}</strong>
                  </div>
                </div>
              </section>

              <section className="portfolio-capm-card">
                <span className="portfolio-capm-card-label">As-is comparison</span>
                <div className="portfolio-capm-table">
                  <div className="portfolio-capm-table-row portfolio-capm-table-head">
                    <span>Metric</span>
                    <span>Your portfolio</span>
                    <span>CAPM baseline</span>
                  </div>
                  <div className="portfolio-capm-table-row">
                    <span>Return</span>
                    <strong>{formatPercent(capmAnalysis.portfolio_return)}</strong>
                    <strong>{formatPercent(capmAnalysis.capm_expected_return)}</strong>
                  </div>
                  <div className="portfolio-capm-table-row">
                    <span>Volatility</span>
                    <strong>{formatPercent(capmAnalysis.portfolio_volatility)}</strong>
                    <strong>--</strong>
                  </div>
                  <div className="portfolio-capm-table-row">
                    <span>Sharpe</span>
                    <strong>{formatSharpe(capmAnalysis.portfolio_sharpe)}</strong>
                    <strong>--</strong>
                  </div>
                  <div className="portfolio-capm-table-row">
                    <span>Alpha</span>
                    <strong className={capmAnalysis.alpha >= 0 ? "positive" : "negative"}>{formatSignedPercent(capmAnalysis.alpha)}</strong>
                    <strong>0.0%</strong>
                  </div>
                  <div className="portfolio-capm-table-row">
                    <span>Beta</span>
                    <strong>{capmAnalysis.beta.toFixed(2)}</strong>
                    <strong>1.00</strong>
                  </div>
                </div>
              </section>

              <section className="portfolio-capm-card">
                <span className="portfolio-capm-card-label">Calculation formula</span>
                <div className="portfolio-capm-formula-shell">
                  <div className="portfolio-capm-formula-block">
                    <code>CAPM = Rf + β × (Rm - Rf)</code>
                    <code>
                      = {formatPercent1(capmAnalysis.risk_free_rate)} + {formatSignedNumber(simulatedBeta, 2)} × (
                      {formatPercent1(capmAnalysis.benchmark_return)} - {formatPercent1(capmAnalysis.risk_free_rate)})
                    </code>
                    <code>= {formatPercent1(simulationCapmReturn)}</code>
                  </div>
                  <div className="portfolio-capm-formula-alpha">
                    <span>Alpha = Actual return - CAPM expected return</span>
                    <strong className={simulationAlpha >= 0 ? "positive" : "negative"}>
                      {formatPercent1(simulatedReturn)} - {formatPercent1(simulationCapmReturn)} = {formatSignedPercent(simulationAlpha)}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="portfolio-capm-card">
                <span className="portfolio-capm-card-label">Simulation</span>
                <p>Move the inputs to see how the CAPM baseline and alpha change.</p>
                <div className="portfolio-capm-simulation">
                  <div className="portfolio-capm-sim-row">
                    <div className="portfolio-capm-sim-header">
                      <span>Actual return</span>
                      <strong>{formatPercent1(simulatedReturn)}</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={returnSliderMax}
                      step={0.001}
                      value={simulatedReturn}
                      onChange={(event) => setSimulatedReturn(Number(event.target.value))}
                    />
                  </div>
                  <div className="portfolio-capm-sim-row">
                    <div className="portfolio-capm-sim-header">
                      <span>Portfolio beta</span>
                      <strong>{simulatedBeta.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={2}
                      step={0.01}
                      value={simulatedBeta}
                      onChange={(event) => setSimulatedBeta(Number(event.target.value))}
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
