import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <div className="home-card">
        <p className="eyebrow">Minimal MVP</p>
        <h1>Global News Pulse</h1>
        <p>
          FastAPI fetches GDELT, groups articles into fake regions for the MVP, and the
          frontend renders a simple interactive map with a right-side news panel.
        </p>
        <Link href="/explore" className="primary-link">
          Open Explore
        </Link>
      </div>
    </main>
  );
}

