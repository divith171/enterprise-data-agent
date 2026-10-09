import { Reveal } from "./Reveal";

const LINES = [
  { text: "Not another dashboard.", tone: "text-white/35" },
  { text: "Not another SQL editor.", tone: "text-white/50" },
  { text: "Not another chatbot.", tone: "text-white/65" },
];

export const Differentiation = () => (
  <section
    data-testid="differentiation-section"
    className="relative bg-abyss"
  >
    <div className="mx-auto max-w-6xl px-6 py-28 md:px-12 md:py-44 lg:px-16">
      <div className="space-y-5 md:space-y-8">
        {LINES.map((l, i) => (
          <Reveal key={l.text} delay={i * 0.1}>
            <p
              className={`text-3xl font-normal tracking-tight md:text-5xl lg:text-6xl ${l.tone}`}
            >
              {l.text}
            </p>
          </Reveal>
        ))}
        <Reveal delay={0.35}>
          <p className="pt-8 text-4xl font-medium tracking-tight text-ink md:pt-12 md:text-6xl lg:text-7xl">
            An analyst you can <span className="text-brand">talk</span> to.
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);
