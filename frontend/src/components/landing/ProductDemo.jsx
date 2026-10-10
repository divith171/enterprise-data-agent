import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal, EASE } from "./Reveal";

const ROWS = [
  { region: "West", revenue: "$1.24M", growth: "+21.6%", up: true },
  { region: "South", revenue: "$0.98M", growth: "+7.7%", up: true },
  { region: "North", revenue: "$0.81M", growth: "+2.5%", up: true },
  { region: "East", revenue: "$0.76M", growth: "-7.3%", up: false },
];

const STEPS = [
  "Understanding the question",
  "Finding relevant data",
  "Planning the analysis",
  "Generating the query",
  "Validating the query",
  "Answer ready",
];

const STEP_MS = 500;

export const ProductDemo = () => {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? STEPS.length - 1 : -1);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setStep(STEPS.length - 1);
      return undefined;
    }
    setStep(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setStep(Math.min(i, STEPS.length - 1));
      if (i >= STEPS.length - 1) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const answerVisible = step >= STEPS.length - 1;

  return (
    <section
      id="product"
      ref={sectionRef}
      data-testid="product-section"
      className="relative bg-deep"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-12 lg:gap-12 lg:px-16">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
              The product
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 text-3xl font-medium leading-[1.08] tracking-tight text-ink md:text-5xl">
              Ask the question.
              <br />
              Get the answer.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/80 md:text-xl">
              No dashboards to build. No SQL to write. Ask DataKat the same way
              you'd ask an analyst.
            </p>
          </Reveal>

          <div className="relative mt-10" data-testid="analysis-sequence">
            <span aria-live="polite" className="sr-only">
              {answerVisible ? "Analysis complete. Answer ready." : ""}
            </span>
            <div
              aria-hidden="true"
              className="absolute bottom-2.5 left-[3px] top-2.5 w-px bg-white/10"
            />
            <motion.div
              aria-hidden="true"
              className="absolute bottom-2.5 left-[3px] top-2.5 w-px origin-top bg-brand/70"
              initial={false}
              animate={{ scaleY: step < 0 ? 0 : step / (STEPS.length - 1) }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
            <ol className="space-y-4">
              {STEPS.map((label, i) => {
                const done = step > i;
                const active = step === i;
                return (
                  <li
                    key={label}
                    data-testid={`analysis-step-${i + 1}`}
                    className="relative flex items-center gap-3.5 pl-6"
                  >
                    <span className="absolute left-[-2px] flex h-[11px] w-[11px] items-center justify-center">
                      {done ? (
                        <Check
                          size={11}
                          strokeWidth={2.5}
                          aria-hidden="true"
                          className="text-white/45"
                        />
                      ) : (
                        <>
                          {active && !reduce && (
                            <motion.span
                              aria-hidden="true"
                              className="absolute inset-0 rounded-full bg-brand/50"
                              animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                              transition={{
                                duration: 1.1,
                                repeat: Infinity,
                                ease: "easeOut",
                              }}
                            />
                          )}
                          <span
                            aria-hidden="true"
                            className={`relative h-[7px] w-[7px] rounded-full ${
                              active ? "bg-brand" : "bg-white/15"
                            }`}
                          />
                        </>
                      )}
                    </span>
                    <span
                      className={`text-sm md:text-base ${
                        active
                          ? "font-medium text-brand"
                          : done
                            ? "text-white/50"
                            : "text-white/30"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <Reveal delay={0.2} className="lg:col-span-7">
          <div
            data-testid="product-console"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent"
            />
            <div className="p-6 md:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">
                Question
              </p>
              <p
                data-testid="demo-question"
                className="mt-3 text-lg font-medium text-ink md:text-xl"
              >
                Which region drove our growth last quarter?
              </p>
            </div>
            <motion.div
              initial={false}
              animate={{
                opacity: answerVisible ? 1 : 0,
                y: answerVisible ? 0 : 12,
              }}
              transition={{ duration: 0.6, ease: EASE }}
              className="border-t border-white/5 p-6 md:p-8"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand">
                DataKat
              </p>
              <p
                data-testid="demo-answer"
                className="mt-3 text-sm leading-relaxed text-white/80 md:text-base"
              >
                West generated the strongest revenue growth last quarter, while
                East declined compared with the previous quarter. South and
                North grew more modestly.
              </p>
            </motion.div>
            <motion.div
              initial={false}
              animate={{ opacity: answerVisible ? 1 : 0 }}
              transition={{ duration: 0.5, delay: answerVisible ? 0.25 : 0 }}
              className="border-t border-white/5 px-6 pb-7 pt-2 md:px-8 md:pb-9"
            >
              <table
                className="w-full text-sm"
                data-testid="demo-results-table"
              >
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-white/35">
                    <th scope="col" className="py-4 font-medium">Region</th>
                    <th scope="col" className="py-4 text-right font-medium">Revenue</th>
                    <th scope="col" className="py-4 text-right font-medium">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <motion.tr
                      key={r.region}
                      data-testid={`demo-row-${r.region.toLowerCase()}`}
                      initial={false}
                      animate={{
                        opacity: answerVisible ? 1 : 0,
                        y: answerVisible ? 0 : 8,
                      }}
                      transition={{
                        duration: 0.45,
                        delay: answerVisible ? 0.4 + i * 0.12 : 0,
                        ease: EASE,
                      }}
                      className="border-t border-white/5 transition-colors duration-300 hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 text-white/90">{r.region}</td>
                      <td className="py-3.5 text-right text-white/90 [font-feature-settings:'tnum']">
                        {r.revenue}
                      </td>
                      <td
                        className={`py-3.5 text-right font-medium [font-feature-settings:'tnum'] ${
                          r.up ? "text-brand" : "text-rose-300/80"
                        }`}
                      >
                        {r.growth}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
