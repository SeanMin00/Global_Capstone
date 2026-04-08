import { HeatmapPanel } from "@/components/heatmap-panel";
import { SectionCard } from "@/components/section-card";
import { fetchHeatmap } from "@/lib/api";

export default async function HeatmapPage() {
  const data = await fetchHeatmap();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">
        Market Heatmap
      </p>
      <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold text-ink">
        Sector and region pulse
      </h1>
      <p className="mt-4 max-w-3xl text-sm text-ink/70">
        For the MVP, this view can stay mock-data driven until the ingestion pipeline and
        daily aggregation are stable.
      </p>

      <div className="mt-8">
        <HeatmapPanel nodes={data.nodes} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {data.nodes.map((node) => (
          <SectionCard key={node.name} eyebrow={node.region_code} title={node.name}>
            <p>Sector: {node.sector}</p>
            <p className="mt-2">Sentiment: {node.sentiment_score.toFixed(2)}</p>
            <p className="mt-2">Fear: {node.fear_score}</p>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

