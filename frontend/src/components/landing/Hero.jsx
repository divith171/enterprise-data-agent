import { useEffect, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { scrollToHash } from "../../lib/scroll";
import { EASE } from "./Reveal";

const MaskedLine = ({ children, delay }) => {
  const reduce = useReducedMotion();
  return (
    <span className="-mb-1 block overflow-hidden pb-1">
      <motion.span
        className="block"
        initial={{ y: reduce ? 0 : "112%", opacity: reduce ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
};

const FadeUp = ({ children, delay, className = "", testid }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-testid={testid}
      initial={{ opacity: 0, y: reduce ? 0 : 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const Hero = () => {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    v.muted = true;
    const tryPlay = () => {
      if (!v.paused) return;
      v.play().catch(() => {});
    };
    tryPlay();
    const retries = [250, 750, 1500, 3000].map((ms) => setTimeout(tryPlay, ms));
    v.addEventListener("canplay", tryPlay);
    v.addEventListener("pause", tryPlay);
    const onPageShow = () => tryPlay();
    const onVisibility = () => {
      if (!document.hidden) tryPlay();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    const gestures = ["pointerdown", "touchstart", "scroll", "keydown"];
    gestures.forEach((e) => window.addEventListener(e, tryPlay, { passive: true }));
    return () => {
      retries.forEach(clearTimeout);
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("pause", tryPlay);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      gestures.forEach((e) => window.removeEventListener(e, tryPlay));
    };
  }, []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.06]);
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50]);
  const mediaOpacity = useTransform(scrollYProgress, [0.62, 0.98], [1, 0]);
  const veilOpacity = useTransform(scrollYProgress, [0.05, 0.75], [0, 1]);
  const depthOpacity = useTransform(scrollYProgress, [0.45, 0.95], [0, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.3], [0, reduce ? 0 : -48]);

  return (
    <section
      ref={ref}
      data-testid="hero-section"
      aria-label="DataKat — Your AI Data Analyst"
      className="relative h-[220vh] bg-deep"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          style={{ scale: mediaScale, y: mediaY, opacity: mediaOpacity }}
          className="absolute inset-0"
          aria-hidden="true"
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover object-[72%_50%] md:object-[60%_30%]"
            autoPlay
            muted
            defaultMuted
            loop
            playsInline
            preload="auto"
            poster="/media/hero-poster.webp"
            tabIndex={-1}
          >
            <source src="/media/datakat-hero.webm" type="video/webm" />
            <source src="/media/datakat-hero.mp4" type="video/mp4" />
          </video>
        </motion.div>

        {/* Localized readability gradient — left on desktop, bottom on mobile */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,18,38,0.92)_0%,rgba(8,18,38,0.38)_38%,rgba(8,18,38,0)_62%)] md:bg-[linear-gradient(100deg,rgba(8,18,38,0.85)_0%,rgba(8,18,38,0.42)_34%,rgba(8,18,38,0)_60%)]"
        />

        {/* Faint top scrim so the navbar stays readable over the sunlit surface */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(8,18,38,0.38),rgba(8,18,38,0))]"
        />

        {/* Surface → depth transition layers */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: veilOpacity }}
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,20,40,0.10)_0%,rgba(10,20,40,0.55)_45%,#0A1428_100%)]"
        />
        <motion.div
          aria-hidden="true"
          style={{ opacity: depthOpacity }}
          className="absolute inset-0 bg-deep"
        />

        {/* Copy */}
        <motion.div
          style={{ opacity: contentOpacity, y: contentY }}
          className="relative z-10 flex h-full items-end pb-24 md:items-center md:pb-0"
        >
          <div className="w-full max-w-[600px] px-6 md:px-12 lg:px-16">
            <FadeUp delay={0.18} testid="hero-eyebrow">
              <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-white/75 md:text-xs">
                <span aria-hidden="true" className="h-px w-8 bg-brand" />
                Analyst intelligence, on demand
              </p>
            </FadeUp>

            <h1 className="mt-6 text-4xl font-medium leading-[1.04] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              <MaskedLine delay={0.32}>Your AI</MaskedLine>
              <MaskedLine delay={0.44}>
                Data Analyst<span className="text-brand">.</span>
              </MaskedLine>
            </h1>

            <FadeUp delay={0.6} testid="hero-subcopy">
              <p className="mt-6 max-w-[520px] text-base leading-relaxed text-white/80 md:text-lg">
                Ask your data a business question in plain English. DataKat
                finds the relevant data, analyzes it, and explains the answer
                clearly.
              </p>
            </FadeUp>

            <FadeUp delay={0.75} testid="hero-ctas">
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <a
                  href="#product"
                  onClick={scrollToHash("#product")}
                  data-testid="hero-cta-primary"
                  className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-abyss transition-colors duration-300 hover:bg-white"
                >
                  See DataKat in Action
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </a>
                <a
                  href="#how-it-works"
                  onClick={scrollToHash("#how-it-works")}
                  data-testid="hero-cta-secondary"
                  className="text-sm text-white/80 underline decoration-white/30 underline-offset-8 transition-colors duration-300 hover:text-white hover:decoration-brand"
                >
                  How it works
                </a>
              </div>
            </FadeUp>
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          style={{ opacity: contentOpacity }}
          aria-hidden="true"
          className="absolute bottom-8 left-6 z-10 flex items-center gap-3 md:left-12 lg:left-16"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
            Descend
          </span>
          <span className="h-10 w-px bg-gradient-to-b from-brand/70 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};
