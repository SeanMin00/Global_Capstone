"use client";

import Link from "next/link";
import { useState } from "react";

import {
  mockArticles,
  mockHeatmapNodes,
  mockPromptSuggestions,
  mockRegionDetails,
  mockRegionSentiment,
  mockWatchlist,
  type MockArticle,
} from "@/lib/mock-data";

type WorkspaceSection = "map" | "chart" | "chat" | "personal";

type WorkspaceProps = {
  initialSection?: WorkspaceSection;
};

type ChatBubble = {
  role: "assistant" | "user";
  content: string;
};

const sections: { id: WorkspaceSection; label: string; short: string }[] = [
  { id: "map", label: "Map", short: "MP" },
  { id: "chart", label: "Chart", short: "CH" },
  { id: "chat", label: "AI Chat", short: "AI" },
  { id: "personal", label: "Personal", short: "ME" },
];

const regionPositions: Record<string, { top: string; left: string }> = {
  "north-america": { top: "36%", left: "24%" },
  europe: { top: "27%", left: "54%" },
  "asia-pacific": { top: "39%", left: "77%" },
  "latin-america": { top: "74%", left: "36%" },
};

function toneLabel(sentiment: number) {
  if (sentiment >= 0.18) return "Positive";
  if (sentiment <= -0.08) return "Risk-off";
  return "Neutral";
}

function toneColor(sentiment: number) {
  if (sentiment >= 0.18) return "from-emerald-400/90 to-lime-300/90";
  if (sentiment <= -0.08) return "from-rose-500/90 to-orange-400/90";
  return "from-amber-300/90 to-yellow-200/90";
}

function articleToneClass(sentiment: number) {
  if (sentiment >= 0.18) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (sentiment <= -0.08) return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  return "border-amber-300/30 bg-amber-300/10 text-amber-100";
}

function buildReply(regionKey: string, input: string) {
  const detail = mockRegionDetails[regionKey] ?? mockRegionDetails["north-america"];
  const mood =
    detail.sentiment_score >= 0.18
      ? "constructive"
      : detail.sentiment_score <= -0.08
        ? "defensive"
        : "mixed";

  return `${detail.region_name} feels ${mood} right now. Fear sits at ${detail.fear_score}, and the first thing I would watch is ${detail.top_topics[0]}. For this MVP, treat the signal as decision support, not investment advice. Prompt captured: "${input}".`;
}

function StageMap({
  selectedRegion,
  onSelectRegion,
}: {
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#07111f] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(36,211,238,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(190,242,100,0.12),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.45)_1px,transparent_1px)] bg-[size:52px_52px]" />
      <div className="absolute inset-x-0 top-[20%] h-px bg-cyan-300/30" />
      <div className="absolute inset-x-0 top-[53%] h-px bg-cyan-300/20" />
      <div className="absolute inset-x-0 top-[74%] h-px bg-cyan-300/20" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Live region stage</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Global discovery map</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          Mock mode only
        </div>
      </div>

      <div className="relative mt-8 h-[430px] overflow-hidden rounded-[1.75rem] border border-cyan-400/10 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.25),rgba(2,6,23,0.92))]">
        <div className="absolute left-[7%] top-[18%] h-[120px] w-[220px] rounded-[45%] border border-cyan-300/20 bg-cyan-400/10 blur-[1px]" />
        <div className="absolute left-[44%] top-[13%] h-[90px] w-[120px] rounded-[48%] border border-cyan-300/20 bg-cyan-400/10 blur-[1px]" />
        <div className="absolute left-[51%] top-[23%] h-[120px] w-[130px] rounded-[46%] border border-cyan-300/20 bg-cyan-400/10 blur-[1px]" />
        <div className="absolute left-[62%] top-[18%] h-[150px] w-[250px] rounded-[48%] border border-cyan-300/20 bg-cyan-400/10 blur-[1px]" />
        <div className="absolute left-[25%] top-[58%] h-[132px] w-[120px] rounded-[48%] border border-cyan-300/20 bg-cyan-400/10 blur-[1px]" />
        <div className="absolute left-[80%] top-[70%] h-[88px] w-[95px] rounded-[50%] border border-cyan-300/20 bg-cyan-400/10 blur-[1px]" />

        {mockRegionSentiment.map((region) => {
          const isActive = region.region_code === selectedRegion;
          const position = regionPositions[region.region_code];

          return (
            <button
              key={region.region_code}
              type="button"
              onClick={() => onSelectRegion(region.region_code)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
              style={{ top: position.top, left: position.left }}
            >
              <span
                className={`absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  isActive ? "animate-pulse-ring bg-cyan-300/10" : "bg-white/0"
                }`}
              />
              <span
                className={`relative block rounded-full border px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition ${
                  isActive
                    ? "border-white/60 bg-white text-slate-950"
                    : "border-white/10 bg-slate-950/80 text-white hover:border-cyan-300/40"
                }`}
              >
                <span
                  className={`mb-2 block h-3 w-3 rounded-full bg-gradient-to-r ${toneColor(
                    region.sentiment_score,
                  )}`}
                />
                <span className="block text-sm font-semibold">{region.region_name}</span>
                <span className="mt-1 block text-[11px] text-slate-400 group-hover:text-slate-300">
                  {toneLabel(region.sentiment_score)} • fear {region.fear_score}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapInsights({
  selectedRegion,
  query,
  setQuery,
  activeCategory,
  setActiveCategory,
}: {
  selectedRegion: string;
  query: string;
  setQuery: (value: string) => void;
  activeCategory: string;
  setActiveCategory: (value: string) => void;
}) {
  const detail = mockRegionDetails[selectedRegion];
  const regionArticles = mockArticles.filter((article) => article.region_code === selectedRegion);
  const articles = mockArticles.filter((article) => {
    const matchesRegion = article.region_code === selectedRegion;
    const matchesCategory = activeCategory === "All" || article.category === activeCategory;
    const matchesQuery =
      query.trim().length === 0 ||
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.summary.toLowerCase().includes(query.toLowerCase());

    return matchesRegion && matchesCategory && matchesQuery;
  });

  const categories = ["All", ...Array.from(new Set(regionArticles.map((article) => article.category)))];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Discovery</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{detail.region_name}</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            {toneLabel(detail.sentiment_score)}
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{detail.summary}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activeCategory === category
                  ? "border-lime-300/40 bg-lime-300 text-slate-950"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/30"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SignalCard label="Sentiment" value={detail.sentiment_score.toFixed(2)} hint="Daily weighted tone" />
          <SignalCard label="Fear" value={detail.fear_score.toString()} hint="Higher means more risk-off" />
          <SignalCard label="Momentum" value={detail.momentum_score.toString()} hint="Relative news acceleration" />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Filter and search</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Headline rail</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            {articles.length} results
          </div>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search headlines or themes"
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />

        <div className="mt-5 space-y-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
          {articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              No matching headlines in this mock dataset yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChartStudio({ selectedRegion }: { selectedRegion: string }) {
  const regionNodes = mockHeatmapNodes.filter((node) => node.region_code === selectedRegion);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Heat blocks</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Sector pulse for {mockRegionDetails[selectedRegion].region_name}</h3>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {mockHeatmapNodes.map((node) => (
            <div
              key={node.name}
              className="rounded-[1.6rem] border border-white/10 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              style={{
                background:
                  node.sentiment_score > 0.15
                    ? "linear-gradient(160deg, rgba(22,163,74,0.85), rgba(74,222,128,0.32))"
                    : node.sentiment_score < -0.08
                      ? "linear-gradient(160deg, rgba(225,29,72,0.82), rgba(251,146,60,0.28))"
                      : "linear-gradient(160deg, rgba(245,158,11,0.82), rgba(253,224,71,0.24))",
              }}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">{node.region_code}</p>
              <p className="mt-6 text-2xl font-semibold">{node.name}</p>
              <div className="mt-5 flex items-end justify-between">
                <span className="text-sm text-white/80">{node.sector}</span>
                <span className="text-xl font-bold">{node.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Selected stack</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Drilldown cards</h3>
        <div className="mt-5 space-y-4">
          {regionNodes.map((node) => (
            <div key={node.name} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{node.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{node.sector}</p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  fear {node.fear_score}
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-lime-300"
                  style={{ width: `${Math.min(100, node.value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatStudio({
  selectedRegion,
  searchQuery,
  setSearchQuery,
}: {
  selectedRegion: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const [input, setInput] = useState("What should a beginner investor watch here?");
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      role: "assistant",
      content:
        "I can explain regional mood, fear, and what matters for a beginner investor. This is mock AI for the frontend prototype.",
    },
  ]);

  function handleSend(nextPrompt?: string) {
    const prompt = (nextPrompt ?? input).trim();
    if (!prompt) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: prompt },
      { role: "assistant", content: buildReply(selectedRegion, prompt) },
    ]);
    setInput("");
    setSearchQuery(prompt);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">AI assistant</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Ask in plain language</h3>
          </div>
          <div className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs text-lime-200">
            Frontend mock
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-[1.5rem] px-4 py-4 text-sm leading-6 ${
                message.role === "assistant"
                  ? "bg-white/5 text-slate-200"
                  : "ml-auto bg-cyan-300 text-slate-950"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-28 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Ask about this region, compare two regions, or ask what a beginner should watch."
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Selected region: {mockRegionDetails[selectedRegion].region_name}</p>
            <button
              type="button"
              onClick={() => handleSend()}
              className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Suggested prompts</p>
          <div className="mt-5 space-y-3">
            {mockPromptSuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Search memory</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Last query synced</h3>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {searchQuery || "No prompt sent yet. When you chat, the last prompt also updates the search state."}
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonalStudio({ selectedRegion }: { selectedRegion: string }) {
  const detail = mockRegionDetails[selectedRegion];
  const [riskLevel, setRiskLevel] = useState("Balanced");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Preference setup</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Personal dashboard starter</h3>

        <div className="mt-6 space-y-5">
          <div>
            <p className="mb-3 text-sm text-slate-400">Risk profile</p>
            <div className="flex flex-wrap gap-3">
              {["Conservative", "Balanced", "Curious"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    riskLevel === level
                      ? "bg-lime-300 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-slate-400">Watchlist</p>
            <div className="grid gap-3">
              {mockWatchlist.map((item) => (
                <div key={item} className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-white">{item}</span>
                  <span className="text-xs text-slate-500">Following</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Daily digest preview</p>
        <h3 className="mt-2 text-xl font-semibold text-white">What the personal page can show</h3>

        <div className="mt-6 grid gap-4">
          <SignalCard label="Risk profile" value={riskLevel} hint="Frontend-only toggle for now" dark />
          <SignalCard label="Current focus" value={detail.region_name} hint={detail.top_topics.join(" • ")} dark />
          <SignalCard label="Alert idea" value={`Fear ${detail.fear_score}`} hint="Notify when fear jumps by 10+" dark />
        </div>
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
  hint,
  dark = false,
}: {
  label: string;
  value: string;
  hint: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-[1.5rem] border p-4 ${dark ? "border-white/10 bg-white/5" : "border-white/10 bg-white/5"}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${dark ? "text-white" : "text-white"}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function ArticleCard({ article }: { article: MockArticle }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{article.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{article.summary}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${articleToneClass(article.sentiment_score)}`}>
          {toneLabel(article.sentiment_score)}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{article.source_name}</span>
        <span>{article.category}</span>
      </div>
    </article>
  );
}

export function MvpWorkspace({ initialSection = "map" }: WorkspaceProps) {
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(initialSection);
  const [selectedRegion, setSelectedRegion] = useState("europe");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const selectedPoint =
    mockRegionSentiment.find((region) => region.region_code === selectedRegion) ?? mockRegionSentiment[0];

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#04070d] text-white">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-4 xl:grid-cols-[92px,1fr]">
        <aside className="flex flex-col rounded-[2rem] border border-white/10 bg-[#090d16] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="flex h-14 items-center justify-center rounded-2xl bg-lime-300 text-2xl font-bold text-slate-950">
            Pu
          </div>
          <div className="mt-8 space-y-3">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-4 text-xs transition ${
                  activeSection === section.id
                    ? "bg-white text-slate-950"
                    : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-[11px] font-semibold tracking-[0.18em]">{section.short}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
              MVP only
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,0.16),transparent_20%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#0d111a_0%,#06080f_100%)] px-7 py-7 shadow-[0_30px_70px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                  Real-time style frontend prototype
                </div>
                <h1 className="mt-4 font-[var(--font-display)] text-4xl font-bold leading-tight text-white md:text-6xl">
                  Global News Pulse
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                  A minimal but interactive MVP shell for global market intelligence. It is
                  intentionally frontend-only right now, so we can lock the demo flow before
                  wiring any backend.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <TopMetric label="Selected region" value={selectedPoint.region_name} />
                <TopMetric label="Sentiment" value={selectedPoint.sentiment_score.toFixed(2)} />
                <TopMetric label="Fear score" value={selectedPoint.fear_score.toString()} />
              </div>
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-3">
            {mockRegionSentiment.map((region) => (
              <button
                key={region.region_code}
                type="button"
                onClick={() => {
                  setSelectedRegion(region.region_code);
                  setActiveCategory("All");
                }}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selectedRegion === region.region_code
                    ? "border-lime-300/30 bg-lime-300 text-slate-950"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/30"
                }`}
              >
                {region.region_name}
              </button>
            ))}
          </section>

          {activeSection === "map" ? (
            <div className="space-y-6">
              <StageMap
                selectedRegion={selectedRegion}
                onSelectRegion={(region) => {
                  setSelectedRegion(region);
                  setActiveCategory("All");
                }}
              />
              <MapInsights
                selectedRegion={selectedRegion}
                query={searchQuery}
                setQuery={setSearchQuery}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
              />
            </div>
          ) : null}

          {activeSection === "chart" ? <ChartStudio selectedRegion={selectedRegion} /> : null}
          {activeSection === "chat" ? (
            <ChatStudio
              selectedRegion={selectedRegion}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          ) : null}
          {activeSection === "personal" ? <PersonalStudio selectedRegion={selectedRegion} /> : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <QuickLink
              title="Explore Route"
              description="Keep a dedicated route for the map-led demo."
              href="/explore"
            />
            <QuickLink
              title="Heatmap Route"
              description="Show chart-first storytelling without backend wiring."
              href="/heatmap"
            />
            <QuickLink
              title="Chat Route"
              description="Focus on the AI UX and prompt suggestions."
              href="/chat"
            />
            <QuickLink
              title="Dashboard Route"
              description="Frame personalization and watchlists for the capstone."
              href="/dashboard"
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-300/20 hover:bg-white/[0.05]"
    >
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}
