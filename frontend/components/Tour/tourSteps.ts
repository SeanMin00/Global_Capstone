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
    targetSelector: '[data-tour="profile-preferences-flow"]',
    page: "/profile",
    title: "Start with strategy and risk setup",
    description:
      "Start by setting your investment goal, horizon, risk aversion, and loss tolerance. This gives the rest of the platform the right context.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="profile-signal-bars"]',
    page: "/profile",
    title: "Use the summary bars on the right",
    description:
      "These bars translate your profile into expected return, drawdown tolerance, and diversification need in a simpler visual format.",
    position: "left",
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
    targetSelector: '[data-tour="map-summary-sentiment"]',
    page: "/map",
    title: "Read summary and sentiment together",
    description:
      "This block combines the news summary with the sentiment score, so you can quickly see what happened and whether the tone is positive or negative.",
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
    title: "Compare markets in By Country",
    description:
      "By Country lets you compare one market at a time and inspect which industries are leading inside that market.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="explorer-global-segment-list"]',
    page: "/explorer-segment",
    title: "Then switch to By Segment",
    description:
      "By Segment flips the view so you can compare the same industry theme across multiple markets.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="chart-workspace"]',
    page: "/chart",
    title: "Use the full chart workspace",
    description:
      "This area gives you a quick stock view with price trend, quote summary, and time range controls.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="chart-ticker-search"]',
    page: "/chart",
    title: "Search the ticker you want to test",
    description:
      "Search a ticker here to update the chart, quote, and side metrics for the company you want to inspect.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="pf-input-panel"]',
    page: "/pf",
    title: "Build the portfolio inputs first",
    description:
      "Choose the tickers and weights here. These inputs drive the portfolio chart and the efficiency analysis.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="pf-cml-chart"]',
    page: "/pf",
    title: "Then read the portfolio chart",
    description:
      "Use the CML chart to see where your portfolio sits against random portfolios, the efficient frontier, and the capital market line.",
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
  {
    targetSelector: '[data-tour="pf-beginner-readout"]',
    page: "/pf",
    title: "Finish with the beginner-friendly readout",
    description:
      "This summary translates the chart into plain language so you can understand whether your portfolio looks efficient or needs adjustment.",
    position: "left",
  },
];
