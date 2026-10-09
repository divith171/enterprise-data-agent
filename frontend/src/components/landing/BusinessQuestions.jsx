import { Reveal } from "./Reveal";

const QUESTIONS = [
  "Which region drove growth last quarter?",
  "Which customers are declining month over month?",
  "What changed in revenue this week?",
  "Which products have the highest repeat purchase rate?",
  "Where are we losing margin?",
  "Which accounts contributed most to the decline?",
];

const MarqueeRow = ({ hidden }) => (
  <ul aria-hidden={hidden || undefined} className="flex items-center">
    {QUESTIONS.map((q) => (
      <li key={q} className="flex items-center whitespace-nowrap">
        <span className="px-8 text-2xl font-medium tracking-tight text-white/75 md:px-12 md:text-4xl">
          {q}
        </span>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand/70" />
      </li>
    ))}
  </ul>
);

export const BusinessQuestions = () => (
  <section
    data-testid="business-questions-section"
    className="relative overflow-hidden bg-midnight"
  >
    <div className="mx-auto max-w-6xl px-6 pt-24 md:px-12 md:pt-36 lg:px-16">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
          Business questions
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-4 max-w-3xl text-3xl font-medium leading-[1.1] tracking-tight text-ink md:text-5xl">
          Ask the questions that usually take another dashboard.
        </h2>
      </Reveal>
    </div>

    <div
      className="mt-14 border-y border-white/5 py-8 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] md:mt-20 md:py-10"
      data-testid="questions-marquee"
    >
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]">
        <MarqueeRow />
        <MarqueeRow hidden />
      </div>
    </div>
    <div className="pb-24 md:pb-36" />
  </section>
);
