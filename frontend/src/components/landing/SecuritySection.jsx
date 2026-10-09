import { Reveal } from "./Reveal";

const ITEMS = [
  "Authenticated access",
  "Company-owned data sources",
  "Source ownership validation",
  "Tenant-aware request routing",
  "Application-level SQL validation",
  "Rate-limited query access",
];

export const SecuritySection = () => (
  <section
    id="security"
    data-testid="security-section"
    className="relative bg-abyss"
  >
    <div className="mx-auto max-w-6xl px-6 py-24 md:px-12 md:py-36 lg:px-16">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
          Security
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-4 max-w-3xl text-3xl font-medium leading-[1.1] tracking-tight text-ink md:text-5xl">
          Built for controlled analytical access.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-x-12 gap-y-10 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((t, i) => (
          <Reveal
            key={t}
            delay={i * 0.05}
            data-testid={`security-item-${i + 1}`}
            className="border-t border-white/10 pt-5"
          >
            <span className="text-xs text-brand [font-feature-settings:'tnum']">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2.5 text-lg font-medium tracking-tight text-white/90 md:text-xl">
              {t}
            </h3>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
