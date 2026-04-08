import Link from "next/link";

const featureCards = [
  {
    title: "World map view",
    description: "See regional sentiment, fear, and event clusters in one glance.",
    href: "/explore",
  },
  {
    title: "Market heatmap",
    description: "Turn noisy headlines into a cleaner sector and region pulse.",
    href: "/heatmap",
  },
  {
    title: "AI chat assistant",
    description: "Ask beginner-friendly questions and get region-aware context.",
    href: "/chat",
  },
  {
    title: "Personal dashboard",
    description: "Track watchlists, saved regions, and daily signal summaries.",
    href: "/dashboard",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <section className="grid gap-10 rounded-[2rem] bg-hero-grid px-8 py-12 md:grid-cols-[1.2fr,0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-tide">
            Beginner-first investing intelligence
          </p>
          <h1 className="mt-4 max-w-3xl font-[var(--font-display)] text-5xl font-bold leading-tight text-ink md:text-7xl">
            Global market context without the information overload.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink/75">
            This MVP helps new investors explore regional news sentiment, major events,
            and practical market signals through maps, heatmaps, and an AI coach.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/explore"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Open Explore Map
            </Link>
            <Link
              href="/chat"
              className="rounded-full border border-ink/20 bg-white/70 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white"
            >
              Try AI Assistant
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tide">
            MVP Scope
          </p>
          <div className="mt-4 space-y-4 text-sm text-ink/75">
            <p>1. Pull global headlines on a schedule</p>
            <p>2. Aggregate daily sentiment by region</p>
            <p>3. Visualize signal strength on a map and treemap</p>
            <p>4. Answer beginner investor questions with AI chat</p>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-card transition hover:-translate-y-1"
          >
            <p className="text-xl font-semibold text-ink">{card.title}</p>
            <p className="mt-3 text-sm leading-6 text-ink/70">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

