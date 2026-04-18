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
    title: "나의 투자 성향을 먼저 설정해요",
    description:
      "위험 회피도와 손실 한도를 설정하면, 포트폴리오 분석이 내 상황에 맞게 자동으로 보정됩니다.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="map-region-tabs"]',
    page: "/map",
    title: "세계 시장 온도를 확인해요",
    description:
      "아시아, 북미, 유럽 탭을 클릭하면 지역별 감성 지수와 시장 위험도를 볼 수 있습니다.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="explorer-segment-list"]',
    page: "/explorer",
    title: "수익 기회가 있는 섹터를 찾아요",
    description:
      "국가와 세그먼트를 조합해 평균 ROI와 시장 구조를 비교할 수 있습니다.",
    position: "right",
  },
  {
    targetSelector: '[data-tour="chart-ticker-search"]',
    page: "/chart",
    title: "관심 종목을 직접 검증해요",
    description:
      "티커를 검색하면 가격 차트, 당일 변동, 전일 종가를 바로 확인할 수 있습니다.",
    position: "bottom",
  },
  {
    targetSelector: '[data-tour="pf-cml-chart"]',
    page: "/pf",
    title: "포트폴리오 효율을 최적화해요",
    description:
      "비중을 조정하면 이 차트에서 내 포트폴리오가 효율적 프론티어 대비 어디 있는지 실시간으로 확인됩니다.",
    position: "top",
  },
];
