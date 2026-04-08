import { SectionCard } from "@/components/section-card";
import { fetchRegionDetail } from "@/lib/api";

type RegionPageProps = {
  params: Promise<{ region: string }>;
};

export default async function RegionDetailPage({ params }: RegionPageProps) {
  const { region } = await params;
  const detail = await fetchRegionDetail(region);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">
        Region Detail
      </p>
      <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold text-ink">
        {detail.region_name}
      </h1>
      <p className="mt-4 max-w-3xl text-sm text-ink/75">{detail.summary}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <SectionCard title="Sentiment">
          <p className="text-4xl font-bold text-ink">{detail.sentiment_score.toFixed(2)}</p>
        </SectionCard>
        <SectionCard title="Fear Score">
          <p className="text-4xl font-bold text-ink">{detail.fear_score}</p>
        </SectionCard>
        <SectionCard title="Momentum">
          <p className="text-4xl font-bold text-ink">{detail.momentum_score}</p>
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,1fr]">
        <SectionCard eyebrow="Event Clusters" title="What is moving this region">
          <div className="space-y-4">
            {detail.featured_events.map((event) => (
              <article key={event.id} className="rounded-2xl border border-ink/10 bg-mist p-4">
                <p className="font-semibold text-ink">{event.title}</p>
                <p className="mt-2 text-sm text-ink/70">{event.summary}</p>
                <p className="mt-3 text-xs text-ink/55">
                  {event.event_type} • intensity {event.intensity_score} • {event.article_count} articles
                </p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Articles" title="Featured coverage">
          <div className="space-y-4">
            {detail.featured_articles.map((article) => (
              <article key={article.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="font-semibold text-ink">{article.title}</p>
                <p className="mt-2 text-sm text-ink/70">{article.summary}</p>
                <p className="mt-3 text-xs text-ink/55">
                  {article.source_name} • sentiment {article.sentiment_score.toFixed(2)} • fear{" "}
                  {article.fear_score}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

