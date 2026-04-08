import { type ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
};

export function SectionCard({ eyebrow, title, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-card backdrop-blur">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-4 text-sm text-ink/80">{children}</div>
    </section>
  );
}

