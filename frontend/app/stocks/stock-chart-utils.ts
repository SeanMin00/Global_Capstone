export type StockRange = "1D" | "5D" | "1M" | "6M" | "1Y" | "MAX";

export const STOCK_RANGES: StockRange[] = ["1D", "5D", "1M", "6M", "1Y", "MAX"];

export function mapRangeToQuery(range: StockRange) {
  switch (range) {
    case "1D":
      return { period: "1d", interval: "5m" };
    case "5D":
      return { period: "5d", interval: "30m" };
    case "1M":
      return { period: "1mo", interval: "1d" };
    case "6M":
      return { period: "6mo", interval: "1d" };
    case "1Y":
      return { period: "1y", interval: "1d" };
    case "MAX":
      return { period: "max", interval: "1wk" };
  }
}

export function formatChartDate(value: string, range: StockRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (range === "1D" || range === "5D") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  if (range === "MAX") {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatAxisTick(value: string, range: StockRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (range === "1D") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  if (range === "5D") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  if (range === "MAX") {
    return new Intl.DateTimeFormat("en-US", {
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
