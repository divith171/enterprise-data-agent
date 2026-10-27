import { useRef } from "react";
import { Link } from "react-router-dom";
import { FIXTURES, SOURCE } from "./demoFixtures";
import { CLOSING } from "./motionTokens";
import { useMotionPolicy } from "./motionPolicy";
import { useRevealOnce } from "./useVisiblePlayback";
import { onboardingLabel, productTruthManifest } from "./productTruthManifest";

const NEGATIVES = ["Not another dashboard.", "Not another SQL editor.", "Not another chatbot."];

export const Differentiation = ({ fixture }) => {
  const ref = useRef(null);
  const shown = useRevealOnce(ref, 0.25);
  const { effectiveMotion } = useMotionPolicy();
  const cls = shown && effectiveMotion ? "is-in" : "";
  return (
    <div ref={ref} className="ph-close__band" data-testid="differentiation">
      <div className={`ph-diff ${cls}`}>
        {NEGATIVES.map((line, i) => (
          <p key={line} className="ph-diff__neg ph-mask" style={{ "--d": `${CLOSING.lines[i]}ms` }} data-testid={`diff-line-${i + 1}`}><span>{line}</span></p>
        ))}
        <p className="ph-diff__aff" data-testid="diff-affirmative">An analyst you can <span className="ph-cyan">talk</span> to.</p>
      </div>
      <div className={`ph-receipt ${cls}`} data-testid="answer-receipt">
        <span className="ph-label">{SOURCE.label}</span>
        <p className="ph-receipt__q">{fixture.question}</p>
        <p className="ph-receipt__a">{fixture.answer}</p>
        <span className="ph-caption" style={{ margin: 0 }}>Sample data</span>
      </div>
    </div>
  );
};

export const FinalCTA = () => {
  const ref = useRef(null);
  const shown = useRevealOnce(ref, 0.2);
  const { effectiveMotion } = useMotionPolicy();
  const cls = shown && effectiveMotion ? "is-in" : "";
  return (
    <div ref={ref} className="ph-cta" data-testid="final-cta">
      <h2 id="cta-heading" className="ph-cta__h">
        Your data already knows the answer.
        <span>What do you want to know?</span>
      </h2>
      <div>
        <div className={`ph-qsurface ph-cta-settle ${cls}`} aria-hidden="true" data-testid="cta-question-surface">Your next business question starts here.</div>
        <p className="ph-sr">Your next business question starts here.</p>
        <p className="ph-cta__note" data-testid="cta-note">{onboardingLabel}</p>
        <div className="ph-cta__actions">
          <Link to={productTruthManifest.routes.getStarted} className="ph-btn ph-btn--primary" data-testid="cta-get-started">Get Started</Link>
          <Link to={productTruthManifest.routes.signIn} className="ph-link" data-testid="cta-sign-in">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export const ClosingComposition = ({ activeExampleId }) => (
  <section id="closing" className="ph-chapter" aria-labelledby="cta-heading" data-testid="chapter-closing">
    <div className="ph-container">
      <Differentiation fixture={FIXTURES[activeExampleId]} />
      <FinalCTA />
    </div>
  </section>
);
