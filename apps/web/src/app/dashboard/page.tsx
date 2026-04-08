import { SectionCard } from "@/components/section-card";
import { fetchRegionSentiment } from "@/lib/api";

export default async function DashboardPage() {
  const regions = await fetchRegionSentiment();
  const highestMomentum = [...regions].sort((a, b) => b.momentum_score - a.momentum_score)[0];
  const highestFear = [...regions].sort((a, b) => b.fear_score - a.fear_score)[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">
        Personal Dashboard
      </p>
      <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold text-ink">
        Watchlists and daily market context
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <SectionCard title="Daily Brief">
          <p>Highest positive momentum: {highestMomentum?.region_name}</p>
        </SectionCard>
        <SectionCard title="Risk Watch">
          <p>Highest fear score: {highestFear?.region_name}</p>
        </SectionCard>
        <SectionCard title="Saved Regions">
          <p>North America, Asia Pacific, Europe</p>
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Watchlist" title="Suggested regions to monitor">
          <div className="space-y-4">
            {regions.slice(0, 3).map((region) => (
              <div key={region.region_code} className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="font-semibold text-ink">{region.region_name}</p>
                <p className="mt-2 text-sm text-ink/70">{region.top_topic}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Digest" title="What belongs in the first demo">
          <div className="space-y-3">
            <p>One daily summary card per watched region</p>
            <p>One fear alert when the score rises sharply</p>
            <p>One article cluster with a plain-English explanation</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
