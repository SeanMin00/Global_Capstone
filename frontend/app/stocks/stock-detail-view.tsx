"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatAxisTick,
  formatChartDate,
  mapRangeToQuery,
  STOCK_RANGES,
  type StockRange,
} from "./stock-chart-utils";
import { fetchChart, fetchQuote, type ChartResponse, type QuoteResponse } from "./stock-api";

type Props = {
  initialTicker: string;
  embedded?: boolean;
};

const FEATURED_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "TSM", "ASML", "005930.KS"];

function formatPrice(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  if (!currency) {
    return value.toFixed(2);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function StockChartContent({ initialTicker, embedded = false }: Props) {
  const [tickerInput, setTickerInput] = useState(initialTicker.toUpperCase());
  const [activeTicker, setActiveTicker] = useState(initialTicker.toUpperCase());
  const [selectedRange, setSelectedRange] = useState<StockRange>("1M");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const rangeQuery = useMemo(() => mapRangeToQuery(selectedRange), [selectedRange]);
  const chartData = useMemo(
    () =>
      (chart?.data ?? [])
        .filter((point) => point.close !== null)
        .map((point) => ({
          ...point,
          close: Number(point.close),
        })),
    [chart],
  );

  useEffect(() => {
    async function loadStockData() {
      try {
        setLoading(true);
        setError("");
        const [quoteResponse, chartResponse] = await Promise.all([
          fetchQuote(activeTicker),
          fetchChart(activeTicker, rangeQuery),
        ]);

        setQuote(quoteResponse as QuoteResponse);
        setChart(chartResponse as ChartResponse);
      } catch (fetchError) {
        setQuote(null);
        setChart(null);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load stock data.");
      } finally {
        setLoading(false);
      }
    }

    loadStockData();
  }, [activeTicker, rangeQuery.interval, rangeQuery.period]);

  const isPositive = (quote?.day_change_pct ?? 0) >= 0;

  return (
    <div
      className={embedded ? "stock-embed-card" : "stock-page-card"}
      data-tour={!embedded ? "chart-workspace" : undefined}
    >
      {!embedded ? (
        <div className="stock-page-topbar">
          <div>
            <p className="eyebrow">Stock MVP</p>
            <h1>Simple stock chart</h1>
            <p className="stock-page-copy">
              Yahoo Finance powers a minimal quote and historical chart flow through FastAPI.
            </p>
          </div>
          <Link href="/explore" className="stock-back-link">
            Back to Explore
          </Link>
        </div>
      ) : (
        <div className="stock-embed-topbar">
          <div>
            <p className="eyebrow">Chart view</p>
            <h2>Stock chart workspace</h2>
          </div>
          <div className="map-chip">Yahoo Finance MVP</div>
        </div>
      )}

      <div className="stock-toolbar stock-toolbar-rich">
        <div className="stock-ticker-pills">
          {FEATURED_TICKERS.map((ticker) => (
            <button
              key={ticker}
              type="button"
              className={`stock-ticker-pill ${activeTicker === ticker ? "active" : ""}`}
              onClick={() => {
                setTickerInput(ticker);
                setActiveTicker(ticker);
              }}
            >
              {ticker}
            </button>
          ))}
        </div>

        <div className="stock-search-group" data-tour="chart-ticker-search">
          <label className="stock-input-group">
            <span>Search ticker</span>
            <input
              value={tickerInput}
              onChange={(event) => setTickerInput(event.target.value.toUpperCase())}
              placeholder="AAPL"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setActiveTicker(tickerInput.trim().toUpperCase() || initialTicker.toUpperCase());
                }
              }}
            />
          </label>
          <button
            type="button"
            className="stock-primary-button"
            onClick={() =>
              setActiveTicker(tickerInput.trim().toUpperCase() || initialTicker.toUpperCase())
            }
          >
            Load chart
          </button>
        </div>
      </div>

      {loading ? <div className="stock-state-card">Loading quote and chart...</div> : null}
      {error ? <div className="stock-state-card stock-state-error">{error}</div> : null}

      {!loading && !error && quote ? (
        <section className="stock-detail-grid">
          <div className="stock-chart-panel">
            <div className="stock-header-row">
              <div>
                <p className="eyebrow">{quote.ticker}</p>
                <h2>{quote.company_name || quote.ticker}</h2>
                <p className="stock-subtitle">
                  {quote.exchange || "Exchange unavailable"}
                  {quote.currency ? ` · ${quote.currency}` : ""}
                </p>
              </div>

              <div className={`stock-price-block ${isPositive ? "positive" : "negative"}`}>
                <strong>{formatPrice(quote.current_price, quote.currency)}</strong>
                <span>
                  {quote.day_change > 0 ? "+" : ""}
                  {quote.day_change.toFixed(2)} · {quote.day_change_pct > 0 ? "+" : ""}
                  {quote.day_change_pct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="stock-range-row">
              {STOCK_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`stock-range-button ${selectedRange === range ? "active" : ""}`}
                  onClick={() => setSelectedRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="stock-chart-shell">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={chartData} margin={{ top: 10, right: 18, bottom: 10, left: 4 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => formatAxisTick(String(value), selectedRange)}
                      stroke="#7c8aa5"
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="#7c8aa5"
                      width={72}
                      tickFormatter={(value) => Number(value).toFixed(0)}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(12, 17, 27, 0.96)",
                        color: "#f8fafc",
                      }}
                      formatter={(value: number) => [formatPrice(value, quote.currency), "Close"]}
                      labelFormatter={(label) => formatChartDate(String(label), selectedRange)}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke={isPositive ? "#22c55e" : "#ef4444"}
                      strokeWidth={2.4}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="stock-empty-state">No chart data returned for this range.</div>
              )}
            </div>
          </div>

          <aside className="stock-side-panel">
            <div className="stock-metrics-grid">
              <div className="stock-metric-card">
                <span>Current price</span>
                <strong>{formatPrice(quote.current_price, quote.currency)}</strong>
              </div>
              <div className="stock-metric-card">
                <span>Previous close</span>
                <strong>{formatPrice(quote.previous_close, quote.currency)}</strong>
              </div>
              <div className="stock-metric-card">
                <span>Day change</span>
                <strong>
                  {quote.day_change > 0 ? "+" : ""}
                  {quote.day_change.toFixed(2)}
                </strong>
              </div>
              <div className="stock-metric-card">
                <span>Day change %</span>
                <strong className={isPositive ? "metric-positive" : "metric-negative"}>
                  {quote.day_change_pct > 0 ? "+" : ""}
                  {quote.day_change_pct.toFixed(2)}%
                </strong>
              </div>
            </div>

            <div className="stock-info-card">
              <p className="eyebrow">Request</p>
              <h3>{quote.ticker}</h3>
              <p className="stock-info-copy">
                Range {selectedRange} maps to <strong>{rangeQuery.period}</strong> /{" "}
                <strong>{rangeQuery.interval}</strong>.
              </p>
              <p className="stock-info-copy">
                API source: Yahoo Finance through the backend <code>/api/quote</code> and{" "}
                <code>/api/chart</code>.
              </p>
            </div>
          </aside>
        </section>
      ) : null}

      {!loading && !error && !quote ? (
        <div className="stock-empty-state">No quote data found.</div>
      ) : null}
    </div>
  );
}

export default function StockDetailView({ initialTicker, embedded = false }: Props) {
  if (embedded) {
    return <StockChartContent initialTicker={initialTicker} embedded />;
  }

  return (
    <main className="stock-page-shell">
      <StockChartContent initialTicker={initialTicker} />
    </main>
  );
}
