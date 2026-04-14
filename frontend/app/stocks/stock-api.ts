export type QuoteResponse = {
  ticker: string;
  company_name: string;
  current_price: number;
  previous_close: number;
  day_change: number;
  day_change_pct: number;
  currency: string | null;
  exchange: string | null;
};

export type ChartPoint = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

export type ChartResponse = {
  ticker: string;
  period: string;
  interval: string;
  data: ChartPoint[];
};

export type HistoricalClosePoint = {
  date: string;
  close: number;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? fallback;
}

export async function fetchQuote(ticker: string): Promise<QuoteResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/quote?ticker=${encodeURIComponent(ticker)}`,
  );

  if (!response.ok) {
    throw new Error(await parseError(response, `Quote request failed with ${response.status}`));
  }

  return (await response.json()) as QuoteResponse;
}

export async function fetchChart(
  ticker: string,
  params: { period: string; interval: string },
): Promise<ChartResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/chart?ticker=${encodeURIComponent(ticker)}&period=${encodeURIComponent(
      params.period,
    )}&interval=${encodeURIComponent(params.interval)}`,
  );

  if (!response.ok) {
    throw new Error(await parseError(response, `Chart request failed with ${response.status}`));
  }

  return (await response.json()) as ChartResponse;
}

export async function fetchHistoricalCloseSeries(ticker: string): Promise<HistoricalClosePoint[]> {
  const chart = await fetchChart(ticker, { period: "1y", interval: "1d" });

  return chart.data
    .filter((point) => point.close !== null)
    .map((point) => ({
      date: point.date,
      close: Number(point.close),
    }));
}
