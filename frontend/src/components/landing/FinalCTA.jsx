import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

export const FinalCTA = () => (
  <section
    data-testid="final-cta-section"
    className="relative overflow-hidden bg-abyss"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-44 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand/[0.05] blur-[110px]"
    />
    <div className="relative mx-auto max-w-6xl px-6 pb-32 pt-10 md:px-12 md:pb-44 md:pt-16 lg:px-16">
      <Reveal>
        <h2 className="max-w-3xl text-4xl font-medium leading-[1.06] tracking-tight text-ink md:text-6xl lg:text-7xl">
          Your data already knows the answer.
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mt-6 text-lg text-mist md:text-xl">
          What do you want to know?
        </p>
      </Reveal>
      <Reveal delay={0.22}>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            to="/signup"
            data-testid="final-cta-get-started"
            className="rounded-full bg-brand px-7 py-3 text-sm font-medium text-abyss transition-colors duration-300 hover:bg-white"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            data-testid="final-cta-signin"
            className="text-sm text-white/80 underline decoration-white/30 underline-offset-8 transition-colors duration-300 hover:text-white hover:decoration-brand"
          >
            Sign in
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);
