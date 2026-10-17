import { SCHEMA, SQL_LABEL, fmt } from "./demoFixtures";
import { SignedBars, SampleDataTable } from "./charts";

const Fields = ({ fixture, animate, hot = [] }) => (
  <dl className="ph-fields">
    {fixture.interpretation.map((f, i) => (
      <div key={f.id} className={`ph-field ${animate ? "ph-field-enter" : ""} ${hot.includes(f.id) ? "is-hot" : ""}`} style={{ "--i": i }} data-testid={`field-${f.id}`}>
        <dt>{f.label}</dt>
        <dd>{f.value}</dd>
      </div>
    ))}
  </dl>
);

export const SchemaTable = ({ table = "revenue_records", selected, caption, animate, only = false }) => (
  <div>
    <div className="ph-schema" data-testid="schema-table">
      <div className="ph-schema__head ph-mono"><span>{table}</span><span className="ph-muted">sample table</span></div>
      {SCHEMA[table].filter((c) => !only || selected.includes(c)).map((col, i) => (
        <div key={col} className={`ph-schema__row ph-mono ${selected.includes(col) ? "is-sel" : ""} ${animate && selected.includes(col) ? "ph-field-enter" : ""}`} style={{ "--i": i }}>
          <span style={{ flex: 1 }}>{col}</span>
          {selected.includes(col) && <span className="ph-cyan">relevant</span>}
        </div>
      ))}
      {only && <div className="ph-schema__row ph-mono"><span>{SCHEMA[table].length - selected.length} other fields not needed</span></div>}
    </div>
    {caption && <p className="ph-caption">{caption}</p>}
  </div>
);

export const ComparisonTable = ({ fixture, compact, withTotal = true }) => (
  <table className={`ph-table ${compact ? "ph-table--compact" : ""}`} data-testid="comparison-table">
    <thead><tr><th scope="col">Region</th><th scope="col">{fixture.periods.prior}</th><th scope="col">{fixture.periods.current}</th><th scope="col">Change</th></tr></thead>
    <tbody>
      {fixture.rows.map((r) => (
        <tr key={r.id} className={r.id === fixture.chart.emphasisId ? "is-hot" : ""}><td>{r.label}</td><td>{fmt.k(r.q2)}</td><td>{fmt.k(r.q3)}</td><td>{fmt.signedK(r.change)}</td></tr>
      ))}
      {withTotal && <tr className="is-total"><td>Total</td><td>{fmt.k(fixture.total.q2)}</td><td>{fmt.k(fixture.total.q3)}</td><td>{fmt.signedK(fixture.total.change)}</td></tr>}
    </tbody>
  </table>
);

const AnswerLine = ({ fixture, emphasize }) => {
  const [lead, rest] = fixture.answer.split(" of the ");
  return (
    <p className="ph-answer" data-testid="answer-sentence">
      <span className={`ph-answer__emph ${emphasize ? "ph-emph-once" : ""}`} style={{ borderRadius: 4 }}>{lead}</span> of the {rest}
    </p>
  );
};

export const ValidationCheckpoint = ({ compact }) => (
  <div className="ph-check" data-testid="validation-checkpoint">
    <p className="ph-label" style={{ marginBottom: 8 }}>Before execution</p>
    <p className="ph-value">Application-level SQL validation</p>
    {!compact && <p className="ph-muted" style={{ marginTop: 8, fontSize: 14, lineHeight: "20px" }}><span className="ph-check__mark" aria-hidden="true">✓</span>Validation checkpoint</p>}
  </div>
);

export const SqlDisclosure = ({ fixture, onToggle, testid = "sql-disclosure" }) => (
  <details className="ph-details" onToggle={onToggle} data-testid={testid}>
    <summary>Query preview · illustrative</summary>
    <div className="ph-details__body">
      <p className="ph-caption" style={{ margin: "0 0 8px" }}>{SQL_LABEL} · {fixture.sqlCaption}</p>
      <pre className="ph-sql ph-mono" tabIndex={0}>{fixture.sql}</pre>
    </div>
  </details>
);

/* ---------------- six demo states ---------------- */
export const DemoState = ({ state, fixture, animate, onDisclosure }) => {
  switch (state) {
    case 1:
      return (
        <div data-testid="demo-state-1">
          <p className="ph-state-title">Start with a business question</p>
          <p className="ph-state-copy">{fixture.assumption}</p>
        </div>
      );
    case 2:
      return (
        <div data-testid="demo-state-2">
          <p className="ph-state-title">Interpretation</p>
          <Fields fixture={fixture} animate={animate} />
        </div>
      );
    case 3:
      return (
        <div data-testid="demo-state-3">
          <p className="ph-state-title">Relevant fields</p>
          <div className="ph-two">
            <dl className="ph-kv">
              <div><dt>Metric</dt><dd>Net revenue</dd></div>
              <div><dt>By</dt><dd>Region</dd></div>
              <div><dt>Periods</dt><dd>{fixture.periods.current} vs {fixture.periods.prior}</dd></div>
            </dl>
            <SchemaTable selected={fixture.fields} caption="Fields needed for this comparison" animate={animate} />
          </div>
        </div>
      );
    case 4:
      return (
        <div data-testid="demo-state-4">
          <p className="ph-state-title">Compare complete quarters</p>
          <div className="ph-two">
            <ComparisonTable fixture={fixture} compact />
            <SignedBars fixture={fixture} animate={animate} compact />
          </div>
          <p className="ph-eq"><span>Regional change ÷ {fmt.k(fixture.total.change)} total change</span><span>{fixture.dateRanges.prior} · {fixture.dateRanges.current}</span></p>
        </div>
      );
    case 5:
      return (
        <div data-testid="demo-state-5">
          <p className="ph-state-title">Query preview · illustrative</p>
          <div className="ph-two">
            <div>
              <ul className="ph-concepts">
                {fixture.queryConcepts.map((c, i) => <li key={c} className={`ph-concept ${animate ? "ph-field-enter" : ""}`} style={{ "--i": i }}>{c}</li>)}
              </ul>
              <SqlDisclosure fixture={fixture} onToggle={onDisclosure} />
            </div>
            <ValidationCheckpoint />
          </div>
        </div>
      );
    default:
      return (
        <div data-testid="demo-state-6">
          <p className="ph-state-title">Answer</p>
          <AnswerLine fixture={fixture} emphasize={animate} />
          <div style={{ marginTop: 20 }}><SignedBars fixture={fixture} animate={animate} /></div>
          <p className="ph-caption" style={{ fontSize: 14, lineHeight: "20px", color: "#B6C6D6" }}>{fixture.supporting}</p>
          <details className="ph-details" onToggle={onDisclosure} data-testid="view-sample-data">
            <summary>View sample data</summary>
            <div className="ph-details__body">
              <SampleDataTable fixture={fixture} compact />
              <p className="ph-caption">{fixture.definition}</p>
            </div>
          </details>
        </div>
      );
  }
};

export const STEP_TITLES = ["Question", "Interpretation", "Relevant data", "Analysis / comparison", "Query + validation", "Answer"];

/* ---------------- process layers (compact; final geometry) ---------------- */
export const ProcessArtifact = ({ stage, fixture, idle = false }) => {
  switch (stage) {
    case 1:
      return (
        <div data-testid="process-art-1">
          <p className="ph-state-title">Company workspace / Sales sample</p>
          <div className="ph-two" style={{ gridTemplateColumns: "1fr" }}>
            <SchemaTable selected={fixture.fields} only caption={<span className={idle ? "ph-idle" : ""}>Three relevant fields in a company-owned source</span>} />
          </div>
        </div>
      );
    case 2:
      return (
        <div data-testid="process-art-2">
          <p className="ph-state-title">Interpretation</p>
          <Fields fixture={fixture} hot={["metric", "time", "compare"]} />
        </div>
      );
    case 3:
      return (
        <div data-testid="process-art-3">
          <p className="ph-state-title">Compare complete quarters</p>
          <SignedBars fixture={fixture} compact />
          <p className="ph-eq" style={{ marginTop: 16 }}><span className={idle ? "ph-idle" : ""}>Validation checkpoint · before execution</span><span>Total {fmt.signedK(fixture.total.change)}</span></p>
        </div>
      );
    default:
      return (
        <div data-testid="process-art-4">
          <p className="ph-state-title">Answer</p>
          <AnswerLine fixture={fixture} />
          <div style={{ marginTop: 16 }}><SignedBars fixture={fixture} compact showAxis={false} /></div>
        </div>
      );
  }
};
