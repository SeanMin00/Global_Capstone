"use client";

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  page: string;
  spotlightPadding?: number;
}

export const TOUR_COMPLETION_KEY = "global-capstone-tour-complete";

export const tourSteps: TourStep[] = [
  {
    targetSelector: '[data-tour="landing-overview"]',
    page: "/map",
    title: "Start with the product overview",
    description:
      "This workspace brings global news, market risk, sector structure, charts, and portfolio tools into one beginner-friendly flow.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="map-region-tabs"]',
    page: "/map",
    title: "Move across major regions first",
    description:
      "Use Asia, North America, and Europe to switch the map context. This is the fastest way to compare broad market mood before you zoom in.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="map-world-stage"]',
    page: "/map",
    title: "Explore countries on the map",
    description:
      "Hover or click highlighted countries to inspect local sentiment, top segments, and where growth may be stronger than other regions.",
    position: "top",
  },
  {
    targetSelector: '[data-tour="map-risk-card"]',
    page: "/map",
    title: "Open the risk breakdown",
    description:
      "This card explains market risk with three simple drivers: volatility, beta, and FX risk. It helps you see why one market feels safer or riskier than another.",
    position: "left",
  },
  {
    targetSelector: '[data-tour="map-news-feed"]',
    page: "/map",
    title: "Read the latest news with source context",
    description:
      "Use the news list to check what happened, who reported it, and whether the source looks credible enough for your next step.",
    position: "left",
  },
  {
    targetSelector: '[data-tour="explorer-heatmap-stage"]',
    page: "/explorer-heatmap",
    title: "This heatmap view is still a work in progress",
    description:
      "We are building this view into a faster market scanner. For now, use it as a rough visual layer before switching to structure mode for detail.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="explorer-segment-list"]',
    page: "/explorer-structure",
    title: "Use structure view to compare countries and sectors",
    description:
      "This is where you can compare countries, inspect top segments, and see which industries and companies may be outperforming.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="chart-ticker-search"]',
    page: "/chart",
    title: "Check a ticker in the trend viewer",
    description:
      "This chart tool is still growing, but it already lets you search a ticker and verify price trend, daily move, and the previous close.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="pf-cml-chart"]',
    page: "/pf",
    title: "Finish in the portfolio workspace",
    description:
      "This portfolio page is also evolving, but you can already test weights, read the CML chart, and open CAPM analysis to understand market-risk tradeoffs.",
    position: "top",
  },
];
