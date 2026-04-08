import {
  mockHeatmapNodes,
  mockRegionDetails,
  mockRegionSentiment,
  type HeatmapNode,
  type RegionDetail,
  type RegionSentimentPoint,
} from "@/lib/mock-data";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function fetchRegionSentiment(): Promise<RegionSentimentPoint[]> {
  return getJson("/regions/sentiment", mockRegionSentiment);
}

export async function fetchRegionDetail(region: string): Promise<RegionDetail> {
  return getJson(
    `/regions/${region}`,
    mockRegionDetails[region] ?? mockRegionDetails["north-america"],
  );
}

export async function fetchHeatmap(): Promise<{ as_of: string; nodes: HeatmapNode[] }> {
  return getJson("/heatmap", {
    as_of: new Date().toISOString(),
    nodes: mockHeatmapNodes,
  });
}

export async function fetchArticles(region?: string) {
  const search = region ? `?region=${region}` : "";
  return getJson("/articles" + search, []);
}

export async function postChat(message: string, region?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, region }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  } catch {
    return {
      answer:
        "Backend is not reachable yet, so this is a mock assistant reply. The MVP should summarize region sentiment, fear, and top watch items.",
      mode: "mock",
      region_focus: region ?? "north-america",
      cards: [
        {
          title: "Mode",
          value: "Mock",
          detail: "Backend is offline or environment variables are missing.",
        },
      ],
      used_tools: [],
    };
  }
}

