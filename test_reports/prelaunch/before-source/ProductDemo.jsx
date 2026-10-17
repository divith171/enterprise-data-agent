import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { regionalFixture } from "./demoFixtures";
import { DEMO_DURATION, DEMO_TIMELINE } from "./motionTokens";
import { useMotionPolicy, MotionToggle } from "./motionPolicy";
import { useVisiblePlayback } from "./useVisiblePlayback";
import { AnalysisFrame } from "./AnalysisFrame";
import { ChapterHeading } from "./ChapterHeading";
import { STEP_TITLES } from "./frameStates";
import { DemoCanvas } from "./DemoCanvas";

const STEP_COPY = [
  regionalFixture.assumption,
  regionalFixture.interpretation.map((f) => `${f.label}: ${f.value}`).join(" · "),
  `revenue_records → ${regionalFixture.fields.join(", ")}`,
  `Q2 vs Q3 per region; total change ${"+$400k"}; regional change ÷ total change`,
  `${regionalFixture.queryConcepts.join(" · ")} · validation checkpoint before execution`,
  regionalFixture.answer,
];

export const ProductDemo = () => {
  const fixture = regionalFixture;
  const { effectiveMotion } = useMotionPolicy();
  const [visual, setVisual] = useState(6);
  const [status, setStatus] = useState("idle"); // idle | playing | paused | complete
  const [announce, setAnnounce] = useState("");
  const tlRef = useRef(null);
  const sectionRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, onComplete: () => setStatus("complete") });
      DEMO_TIMELINE.forEach(({ state, at }) => tl.call(() => setVisual(state), [], at));
      tl.to({}, { duration: DEMO_DURATION }, 0);
      tlRef.current = tl;
    });
    return () => ctx.revert();
  }, []);

  const pause = useCallback((why) => {
    if (statusRef.current !== "playing") return;
    tlRef.current.pause();
    setStatus("paused");
    if (why) setAnnounce(why);
  }, []);
  useVisiblePlayback(sectionRef, () => pause("Example paused."));

  useEffect(() => {
    if (!effectiveMotion) pause("Example paused.");
  }, [effectiveMotion, pause]);

  const start = () => {
    setVisual(1);
    tlRef.current.restart();
    setStatus("playing");
    setAnnounce("Playing the 16-second example.");
  };
  const resume = () => {
    tlRef.current.play();
    setStatus("playing");
    setAnnounce("Example resumed.");
  };
  const showAnswer = () => {
    tlRef.current.pause(0);
    setVisual(6);
    setStatus("complete");
    setAnnounce("Answer shown.");
  };
  const onDisclosure = (e) => {
    if (e.target.open) pause("Example paused while you read.");
  };

  const animate = effectiveMotion && status !== "idle";

  return (
    <section id="product" ref={sectionRef} className="ph-chapter" aria-labelledby="product-heading" data-testid="chapter-product">
      <div className="ph-container">
        <ChapterHeading
          eyebrow="THE PRODUCT"
          id="product-heading"
          title="Ask the question. Get the answer."
          support="See a business question become a comparison, an answer and the evidence behind it."
          row
          testid="product-heading-block"
        >
          <MotionToggle id="motion-toggle-product" />
        </ChapterHeading>

        <div className="ph-demo">
          <div>
            <p className="ph-label" style={{ marginBottom: 12 }}>Sample question</p>
            <p style={{ fontSize: 18, lineHeight: "26px", margin: 0, maxWidth: 360 }}>{fixture.question}</p>
            <p className="ph-support" style={{ marginTop: 12 }}>
              The frame on the right is a completed answer. Watching the example rebuilds it in six observable steps: question, interpretation, relevant data, comparison, query checkpoint and answer.
            </p>
            {!effectiveMotion && (
              <details className="ph-details" data-testid="view-example-steps" style={{ marginTop: 20 }}>
                <summary>View example steps</summary>
                <ol className="ph-steps ph-details__body">
                  {STEP_TITLES.map((t, i) => (
                    <li key={t}><strong>{t}</strong>{STEP_COPY[i]}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>

          <div className="ph-demo__frame">
            <AnalysisFrame
              variant="demo"
              testid="demo-frame"
              active={status === "playing"}
              questionNode={
                (visual === 1 || visual === 2) && animate ? (
                  <span>Which <mark>region</mark> drove our <mark>growth</mark> <mark>last quarter</mark>?</span>
                ) : (
                  fixture.question
                )
              }
              footerRight={status === "playing" ? "Playing example" : status === "paused" ? "Paused" : null}
            >
              <DemoCanvas state={visual} fixture={fixture} animate={animate} onDisclosure={onDisclosure} />
            </AnalysisFrame>

            <div className="ph-controls" data-testid="demo-controls">
              {effectiveMotion && (status === "idle" || status === "complete") && (
                <button type="button" className="ph-btn ph-btn--primary" onClick={start} data-testid="demo-watch-button">
                  {status === "idle" ? "Watch the example" : "Replay example"}
                </button>
              )}
              {status === "playing" && (
                <>
                  <button type="button" className="ph-btn" onClick={() => pause("Example paused.")} data-testid="demo-pause-button">Pause</button>
                  <button type="button" className="ph-link" onClick={showAnswer} data-testid="demo-show-answer-button">Show answer</button>
                </>
              )}
              {status === "paused" && (
                <>
                  <button type="button" className="ph-btn" onClick={resume} disabled={!effectiveMotion} data-testid="demo-resume-button">Resume</button>
                  <button type="button" className="ph-link" onClick={showAnswer} data-testid="demo-show-answer-button">Show answer</button>
                </>
              )}
              <p className="ph-status" role="status" aria-live="polite" data-testid="demo-status">{announce}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
