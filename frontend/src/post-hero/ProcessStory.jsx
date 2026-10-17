import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { regionalFixture } from "./demoFixtures";
import { PROCESS, easeGeometry, windowProgress } from "./motionTokens";
import { useMotionPolicy, MotionToggle } from "./motionPolicy";
import { useInView } from "./useVisiblePlayback";
import { AnalysisFrame } from "./AnalysisFrame";
import { ChapterHeading } from "./ChapterHeading";
import { ProcessArtifact } from "./frameStates";

gsap.registerPlugin(ScrollTrigger);

export const STAGES = [
  { n: "01", name: "Connect", title: "Connect your company's data.", support: "Start with a company-owned source. This example uses a sample PostgreSQL dataset." },
  { n: "02", name: "Ask", title: "Ask in business language.", support: "Specify the question. Make the metric, period and comparison clear." },
  { n: "03", name: "Analyze", title: "Turn the question into a comparison.", support: "Compare complete periods, calculate the change and check the query before execution." },
  { n: "04", name: "Understand", title: "See the answer and its evidence.", support: "West contributed 55% of the total increase. The comparison stays visible beside the explanation." },
];

const headerHeight = () => document.querySelector('[data-testid="navbar"]')?.getBoundingClientRect().height || 72;

const scrollWindowTo = (y, smooth) => {
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: !smooth, duration: 1 });
  else window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
};

const useProcessLayout = (osReduced) => {
  const compute = useCallback(() => {
    const N = headerHeight();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const S = Math.min(PROCESS.maxStage, vh - N - PROCESS.bottomGap);
    const eligible = !osReduced && vw >= PROCESS.minWidth && vh >= PROCESS.minHeight && S >= PROCESS.minFit;
    return { N, S, T: N + PROCESS.topGap, eligible, key: `${vw}x${vh}x${N}` };
  }, [osReduced]);
  const [layout, setLayout] = useState(compute);
  useEffect(() => {
    const update = () => setLayout((prev) => { const next = compute(); return next.key === prev.key && next.eligible === prev.eligible ? prev : next; });
    update();
    document.fonts?.ready.then(update);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [compute]);
  return layout;
};

const StageCopy = ({ stage, motion, side }) => {
  const s = STAGES[stage - 1];
  return (
    <div key={stage} className={`ph-process-copy ${side === "right" ? "ph-process-copy--right" : ""}`} style={{ gridColumn: side === "right" ? 3 : 1, gridRow: 1 }} data-testid={`process-copy-${stage}`}>
      <span className="ph-process-copy__num">{s.n} {s.name.toUpperCase()}</span>
      <h3 className={`ph-process-copy__title ${motion ? "is-in" : ""}`}>{s.title}</h3>
      <p className={`ph-process-copy__support ${motion ? "is-in" : ""}`}>{s.support}</p>
    </div>
  );
};

const SkipLink = ({ N }) => (
  <a
    href="#workbench-heading"
    className="ph-link"
    data-testid="skip-process-link"
    onClick={(e) => {
      e.preventDefault();
      const el = document.getElementById("workbench-heading");
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - (N + 24);
      scrollWindowTo(y, false);
      el.focus({ preventScroll: true });
    }}
  >
    Skip process
  </a>
);

/* ---------- sticky desktop sequence ---------- */
const StickyProcess = ({ layout, onFitFail }) => {
  const { S, T, N } = layout;
  const { effectiveMotion, userMotion } = useMotionPolicy();
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const layersRef = useRef(null);
  const pRef = useRef(0);
  const motionRef = useRef(userMotion);
  motionRef.current = userMotion;
  const [stage, setStage] = useState(1);
  const stageStateRef = useRef(1);
  const inView = useInView(wrapRef, 0.01);

  const apply = useCallback((p) => {
    pRef.current = p;
    const el = layersRef.current;
    if (!el) return;
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const t = PROCESS.windows.map((w, i) =>
      motionRef.current ? easeGeometry(windowProgress(p, w)) : p >= PROCESS.dominantSwitch[i] ? 1 : 0
    );
    const out = (x) => clamp01(1 - x * 2); // outgoing layer fades in the first half of a transition
    const inn = (x) => clamp01(x * 2 - 1); // incoming layer fades in the second half
    const set = (k, v) => el.style.setProperty(k, v);
    set("--o1", out(t[0]).toFixed(4));
    set("--o2", (inn(t[0]) * out(t[1])).toFixed(4));
    set("--o3", (inn(t[1]) * out(t[2])).toFixed(4));
    set("--o4", inn(t[2]).toFixed(4));
    set("--y1", `${(-12 * t[0]).toFixed(2)}px`);
    set("--y2", `${(-12 * t[1]).toFixed(2)}px`);
    set("--y3", `${(-12 * t[2]).toFixed(2)}px`);
    set("--bar", inn(t[1]).toFixed(4));
    const dominant = 1 + PROCESS.dominantSwitch.filter((s) => p >= s).length;
    if (dominant !== stageStateRef.current) {
      stageStateRef.current = dominant;
      setStage(dominant);
    }
  }, []);

  useLayoutEffect(() => {
    const st = stageRef.current;
    if (st && st.scrollHeight > S + 1) onFitFail();
  }, [S, onFitFail]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: `top ${T}px`,
        end: `+=${3 * S}`,
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
    }, wrapRef);
    return () => ctx.revert();
  }, [S, T, apply]);

  useEffect(() => { apply(pRef.current); }, [userMotion, apply]);

  const goTo = (i) => {
    const top = wrapRef.current.getBoundingClientRect().top + window.scrollY - T;
    scrollWindowTo(top + PROCESS.navTargets[i] * 3 * S, effectiveMotion);
  };

  const idle = effectiveMotion && inView && stage < 4;
  const side = stage % 2 === 1 ? "left" : "right";

  return (
    <div ref={wrapRef} className="ph-process-wrap" style={{ height: 4 * S }} data-testid="process-sticky-wrapper">
      <div ref={stageRef} className="ph-process-stage" style={{ top: T, height: S }} data-testid="process-stage">
        <div className="ph-chapter-head ph-chapter-head--row" style={{ marginBottom: 0 }}>
          <div>
            <p className="ph-eyebrow" style={{ marginBottom: 8 }}>HOW IT WORKS</p>
            <h2 id="process-heading" className="ph-h2" style={{ fontSize: 32, lineHeight: "36px" }}>Connect. Ask. Analyze. Understand.</h2>
          </div>
          <div className="ph-controls" style={{ marginTop: 0 }}>
            <MotionToggle id="motion-toggle-process" />
            <SkipLink N={N} />
          </div>
        </div>

        <div className="ph-process-grid">
          <StageCopy stage={stage} motion={effectiveMotion} side={side} />
          <div style={{ gridColumn: 2, gridRow: 1 }} className={`ph-process-frame ${idle ? "ph-idle-on" : ""}`}>
            <AnalysisFrame
              variant="process"
              testid="process-frame"
              active
              questionNode={<span key={stage} className={effectiveMotion ? "ph-reveal-label is-in" : ""}>{stage === 1 ? "Company workspace / Sales sample" : regionalFixture.question}</span>}
            >
              <div ref={layersRef} className="ph-layers" style={{ height: 230 }}>
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className={`ph-layer ph-layer--${s}`} aria-hidden={s !== stage}>
                    <ProcessArtifact stage={s} fixture={regionalFixture} idle={idle && s === stage} />
                  </div>
                ))}
              </div>
            </AnalysisFrame>
          </div>
        </div>

        <nav className="ph-process-rail" aria-label="Process stages" data-testid="process-rail">
          {STAGES.map((s, i) => (
            <button key={s.n} type="button" className="ph-rail-btn" aria-current={stage === i + 1 ? "step" : undefined} onClick={() => goTo(i)} data-testid={`process-nav-${i + 1}`}>
              <span>{s.n}</span><span>{s.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

/* ---------- normal-flow rows (tablet / mobile / reduced motion / ineligible) ---------- */
const ProcessRows = ({ N }) => (
  <>
    <ChapterHeading eyebrow="HOW IT WORKS" id="process-heading" title="Connect. Ask. Analyze. Understand." row testid="process-heading-block">
      <div className="ph-controls" style={{ marginTop: 0 }}>
        <MotionToggle id="motion-toggle-process" />
        <SkipLink N={N} />
      </div>
    </ChapterHeading>
    <nav aria-label="Process stages" className="ph-controls" style={{ marginTop: 0, marginBottom: 16 }}>
      {STAGES.map((s, i) => (
        <a key={s.n} href={`#process-stage-${i + 1}`} className="ph-link" data-testid={`process-anchor-${i + 1}`}>{s.n} {s.name}</a>
      ))}
    </nav>
    <div className="ph-rows" data-testid="process-rows">
      {STAGES.map((s, i) => (
        <div key={s.n} id={`process-stage-${i + 1}`} className="ph-row" data-testid={`process-row-${i + 1}`}>
          <div>
            <span className="ph-process-copy__num">{s.n} {s.name.toUpperCase()}</span>
            <h3 className="ph-process-copy__title">{s.title}</h3>
            <p className="ph-process-copy__support">{s.support}</p>
          </div>
          <div className="ph-row__art">
            <ProcessArtifact stage={i + 1} fixture={regionalFixture} />
          </div>
        </div>
      ))}
    </div>
  </>
);

export const ProcessStory = () => {
  const { osReduced } = useMotionPolicy();
  const layout = useProcessLayout(osReduced);
  const [fitFailKey, setFitFailKey] = useState(null);
  const onFitFail = useCallback(() => setFitFailKey(layout.key), [layout.key]);
  const sticky = layout.eligible && fitFailKey !== layout.key;
  return (
    <section id="how-it-works" className="ph-chapter" aria-labelledby="process-heading" data-testid="chapter-process">
      <div className="ph-container">
        {sticky ? <StickyProcess layout={layout} onFitFail={onFitFail} /> : <ProcessRows N={layout.N} />}
      </div>
    </section>
  );
};
