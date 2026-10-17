import { forwardRef } from "react";
import { fmt } from "./demoFixtures";

const ORDER = ["time", "dimension", "metric", "compare"]; // rows aligned with order_date / region / net_revenue
const SCHEMA_ROWS = [["order_date", "time"], ["region", "dimension"], ["net_revenue", "metric"]];

/**
 * ProcessCanvas — persistent composition for Connect → Ask → Analyze → Understand.
 * Geometry is a pure function of the eased scroll variables --t1 --t2 --t3 (and --bar/--hl) written by ProcessStory.
 */
export const ProcessCanvas = forwardRef(({ fixture, stage, idle }, ref) => {
  const fields = ORDER.map((id) => fixture.interpretation.find((f) => f.id === id));
  const west = fixture.rows.find((r) => r.id === "west");
  const domain = fixture.chart.domain;
  const zero = (0 - domain[0]) / (domain[1] - domain[0]);
  return (
    <div ref={ref} className={`pc ${idle ? "ph-idle-on" : ""}`} data-stage={stage} data-testid="process-canvas">
      {/* CONNECT: three relevant fields, rows share positions with the Ask fields below */}
      <div className="pc-el pc-schema" aria-hidden={stage !== 1} data-testid="process-art-1">
        <div className="ph-schema">
          <div className="ph-schema__head ph-mono"><span>revenue_records</span><span className="ph-muted">Company workspace / Sales sample</span></div>
          {SCHEMA_ROWS.map(([col, key]) => (
            <div key={col} className={`ph-schema__row ph-mono is-sel pc-row pc-row--${key}`}><span style={{ flex: 1 }}>{col}</span><span className={`ph-cyan ${idle ? "ph-idle" : ""}`}>relevant</span></div>
          ))}
          <div className="ph-schema__row ph-mono pc-row"><span>4 other fields not needed</span></div>
        </div>
      </div>
      {/* ASK: interpretation fields in the same row slots */}
      <dl className="pc-el pc-fields" aria-hidden={stage !== 2} data-testid="process-art-2">
        {fields.map((f) => (
          <div key={f.id} className={`ph-field pc-row pc-row--${f.id}`}><dt>{f.label}</dt><dd>{f.value}</dd></div>
        ))}
      </dl>
      {/* ANALYZE + UNDERSTAND: comparison table with signed change bars, then the derivation */}
      <div className="pc-el pc-analysis" aria-hidden={stage < 3} data-testid="process-art-3">
        <table className="ph-table ph-table--compact pc-table">
          <thead><tr><th scope="col" className="pc-th--dim">Region</th><th scope="col" className="pc-th--period">{fixture.periods.prior}</th><th scope="col" className="pc-th--period">{fixture.periods.current}</th><th scope="col" className="pc-th--change">Change</th></tr></thead>
          <tbody>
            {fixture.rows.map((r) => {
              const v = r.change / 1000, p = (v - domain[0]) / (domain[1] - domain[0]);
              return (
                <tr key={r.id} className={`pc-tr ${r.id === "west" ? "is-hot pc-keep" : ""}`}>
                  <td>{r.label}</td><td className="pc-td--val">{fmt.k(r.q2)}</td><td className="pc-td--val">{fmt.k(r.q3)}</td>
                  <td className="pc-td--change">
                    <span className="pc-track"><span className="ph-bar-zero" style={{ left: `${zero * 100}%` }} /><span className={`pc-fill ${v < 0 ? "ph-bar-fill--neg" : ""}`} style={{ left: `${Math.min(zero, p) * 100}%`, width: `${Math.abs(p - zero) * 100}%`, "--origin": v < 0 ? "right" : "left" }} /></span>
                    <span className="pc-val">{fmt.signedK(r.change)}</span>
                  </td>
                </tr>
              );
            })}
            <tr className="is-total pc-tr pc-keep"><td>Total</td><td>{fmt.k(fixture.total.q2)}</td><td>{fmt.k(fixture.total.q3)}</td><td className="pc-td--change"><span className="pc-val">{fmt.signedK(fixture.total.change)}</span></td></tr>
          </tbody>
        </table>
        <p className={`ph-eq pc-check ${idle && stage === 3 ? "ph-idle" : ""}`}><span>Validation checkpoint · before execution</span></p>
        <div className="pc-result" aria-hidden={stage !== 4} data-testid="process-art-4">
          <p className="dc-eq pc-eq"><span className="dc-eq__a">{fmt.signedK(west.change)}</span><span className="dc-eq__op">÷</span><span className="dc-eq__b">{fmt.signedK(fixture.total.change)} total</span><span className="dc-eq__op">=</span><span className="dc-eq__c">{(west.contribution * 100).toFixed(0)}%</span></p>
          <p className="ph-answer ph-answer--compact pc-answer"><span className="ph-answer__emph">{fixture.answer.split(" of the ")[0]}</span> of the {fixture.answer.split(" of the ")[1]}</p>
        </div>
      </div>
    </div>
  );
});
