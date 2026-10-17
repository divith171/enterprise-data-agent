import { DEMO_LABEL, SOURCE } from "./demoFixtures";

/**
 * AnalysisFrame — the reusable product surface. Presentational only.
 * variant: "demo" (760×456 reference) | "process" (520×390 reference) | "work" (fluid, content height)
 * The outer geometry never morphs; only `children` (the body) changes.
 */
export const AnalysisFrame = ({
  variant = "demo",
  question,
  questionNode,
  active = false,
  children,
  below,
  footerRight,
  className = "",
  testid,
  bodyRef,
  bodyStyle,
}) => (
  <div
    className={`ph-frame ph-frame--${variant} ${active ? "is-active" : ""} ${className}`}
    data-testid={testid}
  >
    <div className="ph-frame__head">
      <span className="ph-frame__brand">DataKat</span>
      <span className="ph-pill" data-testid={`${testid}-source`}>{SOURCE.label}</span>
    </div>
    <div className="ph-frame__strip" data-testid={`${testid}-question`}>
      {questionNode || question}
    </div>
    <div className="ph-frame__body" ref={bodyRef} style={bodyStyle}>
      {children}
    </div>
    {below}
    <div className="ph-frame__foot">
      <span>{DEMO_LABEL}</span>
      {footerRight && <span>{footerRight}</span>}
    </div>
  </div>
);
