import { Reveal } from "./Reveal";

const STAGES = [
  {
    title: "Connect.",
    body: "Connect a PostgreSQL data source.",
  },
  {
    title: "Ask.",
    body: "Ask a business question in everyday language.",
  },
  {
    title: "Analyze.",
    body: "DataKat identifies relevant schema and business context, plans the analysis, and prepares the query.",
  },
  {
    title: "Understand.",
    body: "Receive the result together with a clear explanation of what the data shows.",
  },
];

export const HowItWorks = () => (
  <section
    id="how-it-works"
    data-testid="how-it-works-section"
    className="relative bg-gradient-to-b from-deep to-midnight"
  >
    <div className="mx-auto max-w-6xl px-6 py-24 md:px-12 md:py-36 lg:px-16">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
          How it works
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-4 max-w-3xl text-3xl font-medium leading-[1.1] tracking-tight text-ink md:text-5xl">
          Connect. Ask. Analyze. Understand.
        </h2>
      </Reveal>

      <ol className="mt-14 md:mt-20">
        {STAGES.map((s, i) => (
          <Reveal
            as="li"
            key={s.title}
            delay={i * 0.06}
            data-testid={`how-stage-${i + 1}`}
            className="group grid gap-3 border-t border-white/5 py-9 md:grid-cols-[72px_1fr_1.1fr] md:items-baseline md:gap-10 md:py-12"
          >
            <span className="text-xs text-brand [font-feature-settings:'tnum']">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-2xl font-medium tracking-tight text-ink transition-transform duration-500 group-hover:translate-x-1 md:text-4xl">
              {s.title}
            </h3>
            <p className="max-w-md text-base leading-relaxed text-mist">
              {s.body}
            </p>
          </Reveal>
        ))}
        <li aria-hidden="true" className="border-t border-white/5" />
      </ol>
    </div>
  </section>
);
