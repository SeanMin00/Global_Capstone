import { SectionCard } from "@/components/section-card";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">
        Login / Onboarding
      </p>
      <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold text-ink">
        Keep onboarding simple
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <SectionCard title="MVP Flow">
          <div className="space-y-3">
            <p>1. Sign in with Supabase Auth.</p>
            <p>2. Choose beginner risk level.</p>
            <p>3. Pick up to 3 regions of interest.</p>
            <p>4. Pick topics like rates, AI, energy, or commodities.</p>
          </div>
        </SectionCard>

        <SectionCard title="Captured Preferences">
          <div className="space-y-3">
            <p>Risk profile</p>
            <p>Favorite regions</p>
            <p>Favorite sectors</p>
            <p>Daily digest opt-in</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

