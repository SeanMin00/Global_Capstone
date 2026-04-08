import Link from "next/link";

import { MapPanel } from "@/components/map-panel";
import { SectionCard } from "@/components/section-card";
import { fetchRegionSentiment } from "@/lib/api";

export default async function ExplorePage() {
  const points = await fetchRegionSentiment();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">
          Explore Map
        </p>
        <h1 className="font-[var(--font-display)] text-4xl font-bold text-ink">
          Regional news sentiment at a glance
        </h1>
        <p className="max-w-3xl text-sm text-ink/70">
          This page is the core MVP view. Each region gets a daily sentiment score, fear
          score, momentum score, and top topic cluster.
        </p>
      </div>

      <MapPanel points={points} />

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {points.map((point) => (
          <SectionCard key={point.region_code} eyebrow={point.region_name} title={point.top_topic}>
            <div className="space-y-3">
              <p>Sentiment: {point.sentiment_score.toFixed(2)}</p>
              <p>Fear: {point.fear_score}</p>
              <p>Momentum: {point.momentum_score}</p>
              <p>Articles: {point.article_count}</p>
              <Link href={`/regions/${point.region_code}`} className="text-sm font-semibold text-tide">
                Open region detail
              </Link>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

