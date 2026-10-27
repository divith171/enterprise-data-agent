import { useEffect, useRef, useState } from "react";
import { FIXTURES } from "./demoFixtures";
import { MS } from "./motionTokens";
import { useMotionPolicy } from "./motionPolicy";
import { useStagedSwap } from "./useVisiblePlayback";
import { AnalysisFrame } from "./AnalysisFrame";
import { ChapterHeading } from "./ChapterHeading";
import { PreviewChart, SampleDataTable } from "./charts";
import { QuestionExplorer } from "./QuestionExplorer";
import { AnalysisTrace } from "./AnalysisTrace";

const METRIC_PHRASE = { "regional-growth": "growth", "customer-decline": "declining", "weekly-change": "revenue", "margin-loss": "margin" };

const Question = ({ fixture, hot }) => {
  const phrase = METRIC_PHRASE[fixture.id];
  if (!hot) return fixture.question;
  const [a, b] = fixture.question.split(phrase);
  return <span>{a}<mark>{phrase}</mark>{b}</span>;
};

export const AnalysisWorkbench = ({ activeExampleId, setActiveExampleId }) => {
  const { effectiveMotion } = useMotionPolicy();
  const [activePhase, setActivePhase] = useState("interpret");
  const [highlightId, setHighlightId] = useState(null);
  const [metricHot, setMetricHot] = useState(false);
  const [changedOnce, setChangedOnce] = useState(false);
  const traceHeadingRef = useRef(null);
  const { shown, leaving } = useStagedSwap(activeExampleId, MS.workbenchMask, effectiveMotion);
  const fixture = FIXTURES[shown];

  useEffect(() => {
    setHighlightId(null);
    setMetricHot(false);
    if (shown !== Object.keys(FIXTURES)[0]) setChangedOnce(true);
  }, [shown]);

  const showAnalysis = () => {
    setActivePhase("interpret");
    traceHeadingRef.current?.focus({ preventScroll: false });
  };
  const animate = effectiveMotion && changedOnce;

  return (
    <section id="workbench" className="ph-chapter" aria-labelledby="workbench-heading" data-testid="chapter-workbench">
      <div className="ph-container">
        <ChapterHeading id="workbench-heading" title="Different questions. One analytical process." support="Choose a question. See its interpretation, comparison and supporting evidence." testid="workbench-heading-block" />
        <div className="ph-work">
          <QuestionExplorer selectedId={activeExampleId} onSelect={setActiveExampleId} />
          <AnalysisFrame
            variant="work"
            testid="workbench-frame"
            active
            questionNode={<Question fixture={fixture} hot={metricHot} />}
            below={
              <AnalysisTrace
                fixture={fixture}
                activePhase={activePhase}
                setActivePhase={setActivePhase}
                highlightId={highlightId}
                setHighlightId={setHighlightId}
                metricHot={metricHot}
                setMetricHot={setMetricHot}
                headingRef={traceHeadingRef}
                motion={effectiveMotion}
              />
            }
          >
            <div className={`ph-work__mask ${leaving ? "is-masked" : ""}`} aria-hidden={leaving || undefined}>
              <div key={shown} className="ph-work__preview">
                <dl className="ph-fields ph-fields--2" data-testid="workbench-fields">
                  {fixture.interpretation.map((f, i) => (
                    <div key={f.id} className={`ph-field ${animate ? "ph-field-enter" : ""}`} style={{ "--i": i }}>
                      <dt>{f.label}</dt><dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <div style={{ minHeight: 200 }} data-testid="workbench-preview">
                  <PreviewChart fixture={fixture} animate={animate} highlightId={highlightId} />
                </div>
                <div className="ph-work__answer">
                  <p className="ph-answer ph-answer--compact" data-testid="workbench-answer">{fixture.answer}</p>
                  <button type="button" className="ph-link" onClick={showAnalysis} data-testid="show-analysis-link">Show analysis</button>
                </div>
                <p className="ph-caption" style={{ margin: 0 }}>{fixture.note}</p>
                <details className="ph-details" data-testid="workbench-sample-data">
                  <summary>View sample data</summary>
                  <div className="ph-details__body"><SampleDataTable fixture={fixture} compact /></div>
                </details>
              </div>
            </div>
          </AnalysisFrame>
        </div>
      </div>
    </section>
  );
};
