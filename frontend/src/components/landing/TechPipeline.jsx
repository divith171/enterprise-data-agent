import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Reveal } from "./Reveal";

const STEPS = [
  "Understand the question",
  "Find relevant schema",
  "Resolve business context",
  "Plan the analysis",
  "Generate SQL",
  "Review and validate",
  "Execute",
  "Explain the result",
];

export const TechPipeline = () => {
  const listRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.8", "end 0.5"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      data-testid="pipeline-section"
      className="relative bg-gradient-to-b from-midnight to-abyss"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-12 md:py-36 lg:px-16">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
            The analytical pipeline
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-3xl text-3xl font-medium leading-[1.1] tracking-tight text-ink md:text-5xl">
            More than text-to-SQL.
          </h2>
        </Reveal>

        <div ref={listRef} className="relative mt-16 md:mt-24">
          <div
            aria-hidden="true"
            className="absolute bottom-2 left-[5px] top-2 w-px bg-white/10"
          />
          <motion.div
            aria-hidden="true"
            style={{ scaleY }}
            className="absolute bottom-2 left-[5px] top-2 w-px origin-top bg-gradient-to-b from-brand to-brandblue"
          />
          <ol className="space-y-12 md:space-y-16">
            {STEPS.map((s, i) => (
              <Reveal
                as="li"
                key={s}
                delay={0.04}
                data-testid={`pipeline-step-${i + 1}`}
                className="relative pl-10 md:pl-14"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border border-brand/50 bg-midnight"
                />
                <span className="text-xs text-white/35 [font-feature-settings:'tnum']">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1.5 text-xl font-medium tracking-tight text-white/90 md:text-2xl">
                  {s}
                </h3>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
