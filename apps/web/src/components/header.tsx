import Link from "next/link";

const navItems = [
  { href: "/explore", label: "Explore Map" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/chat", label: "AI Chat" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/onboarding", label: "Onboarding" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-[0.2em] text-mist uppercase">
          Global Signals
        </Link>
        <nav className="hidden gap-5 text-sm text-mist/80 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

