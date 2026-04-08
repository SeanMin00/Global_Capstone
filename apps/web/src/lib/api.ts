import {
  mockArticles,
  mockHeatmapNodes,
  mockRegionDetails,
  mockRegionSentiment,
} from "@/lib/mock-data";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchRegionSentiment() {
  await sleep(120);
  return mockRegionSentiment;
}

export async function fetchRegionDetail(region: string) {
  await sleep(120);
  return mockRegionDetails[region] ?? mockRegionDetails["north-america"];
}

export async function fetchHeatmap() {
  await sleep(120);
  return {
    as_of: new Date().toISOString(),
    nodes: mockHeatmapNodes,
  };
}

export async function fetchArticles(region?: string) {
  await sleep(120);

  if (!region) {
    return mockArticles;
  }

  return mockArticles.filter((article) => article.region_code === region);
}

export async function postChat(message: string, region?: string) {
  await sleep(220);
  const focus = region ?? "north-america";
  const regionDetail = mockRegionDetails[focus] ?? mockRegionDetails["north-america"];

  return {
    answer:
      `${regionDetail.region_name} is currently leaning ` +
      `${regionDetail.sentiment_score >= 0.1 ? "constructive" : regionDetail.sentiment_score <= -0.05 ? "cautious" : "mixed"}. ` +
      `The main watch item is ${regionDetail.top_topics[0]}. ` +
      `For a beginner investor, use this as context, not as a buy or sell signal. ` +
      `Your prompt was: "${message}"`,
    mode: "mock",
    region_focus: focus,
    cards: [
      {
        title: "Region",
        value: regionDetail.region_name,
        detail: regionDetail.summary,
      },
      {
        title: "Sentiment",
        value: regionDetail.sentiment_score.toFixed(2),
        detail: "Weighted daily article tone.",
      },
      {
        title: "Fear Score",
        value: regionDetail.fear_score.toString(),
        detail: "Higher means more risk-off headlines.",
      },
    ],
    used_tools: [],
  };
}
