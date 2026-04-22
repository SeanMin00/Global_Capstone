"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TOUR_PENDING_KEY, type TourScope } from "../components/Tour/tourSteps";

const landingModes = {
  investors: {
    eyebrow: "Global investing, made readable",
    lines: ["Invest Globally,", "Understand Locally."],
    body:
      "Follow regional news, compare market risk, inspect sector structure, and build a portfolio with clearer context across borders.",
  },
  builders: {
    eyebrow: "Cross-market research in one flow",
    lines: ["Invest Globally,", "Understand Locally."],
    body:
      "Use one workflow to move from macro news and country risk into sector discovery, ticker validation, and portfolio efficiency checks.",
  },
} as const;

type LandingMode = keyof typeof landingModes;

const tickerTape = [
  { label: "NIKKEI 225", move: "+1.4%", tone: "up" },
  { label: "S&P 500", move: "+0.8%", tone: "up" },
  { label: "FTSE 100", move: "-0.3%", tone: "down" },
  { label: "DAX", move: "+1.1%", tone: "up" },
  { label: "HANG SENG", move: "-0.6%", tone: "down" },
  { label: "CAC 40", move: "+0.5%", tone: "up" },
  { label: "IBOVESPA", move: "+2.1%", tone: "up" },
  { label: "ASX 200", move: "-0.2%", tone: "down" },
  { label: "SENSEX", move: "+0.9%", tone: "up" },
];

export default function HomePage() {
  const [mode, setMode] = useState<LandingMode>("investors");
  const router = useRouter();
  const content = landingModes[mode];

  const startTour = (scope: TourScope) => {
    window.localStorage.setItem(
      TOUR_PENDING_KEY,
      JSON.stringify({
        scope,
        force: true,
      }),
    );
    router.push("/explore");
  };

  return (
    <main className="landing-shell">
      <div className="landing-ticker-wrap" aria-hidden="true">
        <div className="landing-ticker-track">
          {[...tickerTape, ...tickerTape].map((item, index) => (
            <span key={`${item.label}-${index}`} className={`landing-ticker-item ${item.tone}`}>
              {item.label} <strong>{item.move}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="landing-rings landing-ring-large" aria-hidden="true" />
      <div className="landing-rings landing-ring-small" aria-hidden="true" />

      <section className="landing-hero-card">
        <div className="landing-mode-toggle" role="tablist" aria-label="Landing mode toggle">
          <button
            type="button"
            className={mode === "investors" ? "active" : ""}
            onClick={() => setMode("investors")}
          >
            For Investors
          </button>
          <button
            type="button"
            className={mode === "builders" ? "active" : ""}
            onClick={() => setMode("builders")}
          >
            For Analysts
          </button>
        </div>

        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{content.eyebrow}</p>
          <h1>
            {content.lines.map((line) => (
              <span key={line} className="landing-hero-line">
                {line}
              </span>
            ))}
          </h1>
          <p className="landing-subtext">{content.body}</p>
        </div>

        <div className="landing-cta-row">
          <Link href="/explore" className="landing-btn landing-btn-secondary">
            Explore Markets
          </Link>
          <button
            type="button"
            className="landing-btn landing-btn-primary"
            onClick={() => startTour("full")}
          >
            Start the Tour
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="landing-stat-strip">
          <div className="landing-stat">
            <strong>80+</strong>
            <span>Markets tracked</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <strong>Daily</strong>
            <span>Risk refresh cadence</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <strong>1 flow</strong>
            <span>Map to portfolio</span>
          </div>
        </div>
      </section>
    </main>
  );
}
