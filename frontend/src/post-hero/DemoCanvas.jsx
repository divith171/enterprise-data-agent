import { SCHEMA, fmt } from "./demoFixtures";
import { SignedBars, SampleDataTable } from "./charts";
import { SqlDisclosure, ValidationCheckpoint } from "./frameStates";

const TITLES = { 1: "Start with a business question", 2: "Interpretation", 3: "Relevant fields", 4: "Compare complete quarters", 5: "Query preview · illustrative", 6: "Answer" };
// element → [first visible state, last visible state]
const RANGES = { intro: [1, 1], fields: [2, 3], bars: [4, 6], schema: [3, 3], table: [4, 4], concepts: [5, 5], answer: [6, 6] };
const phase = (el, s) => (s < RANGES[el][0] ? "is-pre" : s > RANGES[el][1] ? "is-out" : "is-in");
const COL = { order_date: "time", region: "dimension", net_revenue: "metric" };

/**
 * DemoCanvas — one persistent composition for the six demo states.
 * Elements never remount between states; CSS transitions move them between shared positions.
 */
export const DemoCanvas = ({ state, fixture, animate, onDisclosure }) => {
  const west = fixture.rows.find((r) => r.id === "west");
  const cls = (el) => `dc-el dc-${el} ${phase(el, state)}`;
  return (
    <div className={`dc dc--s${state} ${animate ? "dc--anim" : ""}`} data-testid={`demo-state-${state}`}>
      <p className="ph-state-title"><span key={state} className={animate ? "ph-reveal-label is-in" : ""}>{TITLES[state]}</span></p>
      <div className="dc-grid">
        <div className="dc-col">
          <div className={cls("intro")} aria-hidden={state !== 1}>
            <p className="ph-state-copy">{fixture.assumption}</p>
            <p className="ph-caption">Three phrases carry the intent: <em>region</em>, <em>growth</em>, <em>last quarter</em>.</p>
          </div>
          <dl className={cls("fields")} aria-hidden={state < 2 || state > 3} data-testid="demo-fields">
            {fixture.interpretation.map((f, i) => (
              <div key={f.id} className={`ph-field dc-field dc-field--${f.id}`} style={{ "--i": i }}>
                <dt>{f.label}</dt><dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className={cls("bars")} aria-hidden={state < 4} data-testid="demo-bars">
            <SignedBars fixture={fixture} compact />
            <p className="dc-eq" aria-hidden={state !== 6} data-testid="demo-equation">
              <span className="dc-eq__a">{fmt.signedK(west.change)}</span>
              <span className="dc-eq__op">÷</span>
              <span className="dc-eq__b">{fmt.signedK(fixture.total.change)} total</span>
              <span className="dc-eq__op">=</span>
              <span className="dc-eq__c">{(west.contribution * 100).toFixed(0)}% of growth</span>
            </p>
          </div>
        </div>
        <div className="dc-col">
          <div className={cls("schema")} aria-hidden={state !== 3}>
            <div className="ph-schema" data-testid="schema-table">
              <div className="ph-schema__head ph-mono"><span>revenue_records</span><span className="ph-muted">sample table</span></div>
              {SCHEMA.revenue_records.map((col) => (
                <div key={col} className={`ph-schema__row ph-mono ${fixture.fields.includes(col) ? `is-sel dc-row--${COL[col]}` : ""}`}>
                  <span style={{ flex: 1 }}>{col}</span>
                  {fixture.fields.includes(col) && <span className="ph-cyan">relevant</span>}
                </div>
              ))}
            </div>
            <p className="ph-caption">Fields needed for this comparison</p>
          </div>
          <div className={cls("table")} aria-hidden={state !== 4}>
            <table className="ph-table ph-table--compact" data-testid="comparison-table">
              <thead><tr><th scope="col" className="dc-th--dim">Region</th><th scope="col" className="dc-th--period">{fixture.periods.prior}</th><th scope="col" className="dc-th--period">{fixture.periods.current}</th><th scope="col">Change</th></tr></thead>
              <tbody>
                {fixture.rows.map((r) => (
                  <tr key={r.id} className={r.id === "west" ? "is-hot" : ""}><td>{r.label}</td><td className="dc-td--val">{fmt.k(r.q2)}</td><td className="dc-td--val">{fmt.k(r.q3)}</td><td>{fmt.signedK(r.change)}</td></tr>
                ))}
                <tr className="is-total"><td>Total</td><td>{fmt.k(fixture.total.q2)}</td><td>{fmt.k(fixture.total.q3)}</td><td>{fmt.signedK(fixture.total.change)}</td></tr>
              </tbody>
            </table>
            <p className="ph-eq"><span>Regional change ÷ {fmt.k(fixture.total.change)} total change</span></p>
          </div>
          <div className={cls("concepts")} aria-hidden={state !== 5}>
            <ul className="ph-concepts">
              {fixture.queryConcepts.map((c, i) => <li key={c} className="ph-concept" style={{ "--i": i }}>{c}</li>)}
            </ul>
            <div className="dc-check"><ValidationCheckpoint /></div>
            <SqlDisclosure fixture={fixture} onToggle={onDisclosure} />
          </div>
          <div className={cls("answer")} aria-hidden={state !== 6}>
            <p className="ph-answer ph-answer--compact" data-testid="answer-sentence">
              <span className="ph-answer__emph">{fixture.answer.split(" of the ")[0]}</span> of the {fixture.answer.split(" of the ")[1]}
            </p>
            <p className="ph-caption" style={{ fontSize: 14, lineHeight: "20px", color: "#B6C6D6" }}>{fixture.supporting}</p>
            <details className="ph-details" onToggle={onDisclosure} data-testid="view-sample-data">
              <summary>View sample data</summary>
              <div className="ph-details__body"><SampleDataTable fixture={fixture} compact /><p className="ph-caption">{fixture.definition}</p></div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};
