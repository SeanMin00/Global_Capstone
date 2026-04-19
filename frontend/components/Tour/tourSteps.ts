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
    targetSelector: '[data-tour="profile-risk-slider"]',
    page: "/profile",
    title: "Set your investor profile first",
    description:
      "Start here by setting your risk aversion and loss limit. The portfolio tools use this to better match your situation.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="map-region-tabs"]',
    page: "/map",
    title: "Move across major regions",
    description:
      "Use Asia, North America, and Europe to switch the market context before you zoom into individual countries.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="map-world-stage"]',
    page: "/map",
    title: "Use the map to explore countries",
    description:
      "Hover and click countries on the map to explore where market mood and regional opportunity look stronger or weaker.",
    position: "top",
  },
  {
    targetSelector: '[data-tour="map-sentiment-card"]',
    page: "/map",
    title: "Read the news-based sentiment score",
    description:
      "This summary and score are based on the latest news flow for the selected market. Use it as a quick read on positive versus negative tone.",
    position: "left",
  },
  {
    targetSelector: '[data-tour="map-risk-card"]',
    page: "/map",
    title: "Open the market risk breakdown",
    description:
      "This card explains market risk with simple drivers like volatility, beta, and FX risk, so you can see why one market looks riskier than another.",
    position: "left",
  },
  {
    targetSelector: '[data-tour="explorer-country-list"]',
    page: "/explorer-country",
    title: "Start structure view with countries",
    description:
      "By Country helps you compare markets one by one and inspect which country has stronger segment structure right now.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="explorer-global-segment-list"]',
    page: "/explorer-segment",
    title: "Then compare global segments",
    description:
      "By Segment flips the view so you can compare industries across markets and see which themes may be leading globally.",
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
    title: "Read portfolio efficiency first",
    description:
      "Use the CML chart to see where your portfolio sits against simulated portfolios and the efficient frontier.",
    position: "top",
  },
  {
    targetSelector: '[data-tour="pf-portfolio-compare"]',
    page: "/pf",
    title: "Compare your portfolio with the optimal one",
    description:
      "This final block compares your current allocation with the tangency portfolio, so you can quickly see return, volatility, and Sharpe differences.",
    position: "top",
  },
];
