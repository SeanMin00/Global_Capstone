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
      "Set your risk aversion and loss limit first. Then the portfolio analysis can better match your situation.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="map-region-tabs"]',
    page: "/map",
    title: "Check the mood of global markets",
    description:
      "Click Asia, North America, or Europe to see regional sentiment and market risk.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="explorer-segment-list"]',
    page: "/explorer",
    title: "Find sectors with strong opportunities",
    description:
      "Mix countries and segments to compare average ROI and market structure.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="chart-ticker-search"]',
    page: "/chart",
    title: "Check your tickers directly",
    description:
      "Search a ticker to see the price chart, daily move, and previous close right away.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="pf-cml-chart"]',
    page: "/pf",
    title: "Improve your portfolio efficiency",
    description:
      "Change your weights and see where your portfolio sits against the efficient frontier in real time.",
    position: "top",
  },
];
