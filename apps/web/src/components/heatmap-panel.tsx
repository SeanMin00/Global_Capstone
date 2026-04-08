"use client";

import dynamic from "next/dynamic";

import type { HeatmapNode } from "@/lib/mock-data";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

type HeatmapPanelProps = {
  nodes: HeatmapNode[];
};

export function HeatmapPanel({ nodes }: HeatmapPanelProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-3 shadow-card">
      <ReactECharts
        style={{ height: 520 }}
        option={{
          backgroundColor: "transparent",
          tooltip: {
            formatter: (params: { data: HeatmapNode }) =>
              `${params.data.name}<br/>Region: ${params.data.region_code}<br/>Sentiment: ${params.data.sentiment_score.toFixed(
                2,
              )}<br/>Fear: ${params.data.fear_score}`,
          },
          series: [
            {
              type: "treemap",
              roam: false,
              breadcrumb: { show: false },
              label: {
                show: true,
                formatter: "{b}",
                color: "#082032",
              },
              upperLabel: { show: false },
              itemStyle: {
                borderColor: "#ffffff",
                borderWidth: 3,
                gapWidth: 3,
              },
              colorMappingBy: "value",
              levels: [
                {
                  color: ["#F07167", "#F6C177", "#00A6A6"],
                },
              ],
              data: nodes.map((node) => ({
                ...node,
                value: node.value,
              })),
            },
          ],
        }}
      />
    </div>
  );
}

