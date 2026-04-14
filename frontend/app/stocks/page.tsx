import Link from "next/link";

export default function StocksLandingPage() {
  return (
    <main className="home-shell">
      <div className="home-card">
        <p className="eyebrow">Stock MVP</p>
        <h1>Simple stock charts</h1>
        <p>
          Open a ticker detail page backed by Yahoo Finance through FastAPI. Start with the
          AAPL example below.
        </p>
        <Link href="/stocks/AAPL" className="primary-link">
          Open AAPL chart
        </Link>
      </div>
    </main>
  );
}
