import { SCHEMA, SQL_LABEL, fmt } from "./demoFixtures";
import { SignedBars } from "./charts";

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

const AnswerLine = ({ fixture, emphasize }) => {
  const [lead, rest] = fixture.answer.split(" of the ");
  return (
    <p className="ph-answer" data-testid="answer-sentence">
      <span className={`ph-answer__emph ${emphasize ? "ph-emph-once" : ""}`} style={{ borderRadius: 4 }}>{lead}</span> of the {rest}
    </p>
  );
};

export const ValidationCheckpoint = ({ compact, testid = "validation-checkpoint" }) => (
  <div className="ph-check" data-testid={testid}>
    <p className="ph-label" style={{ marginBottom: 8 }}>Before execution</p>
    <p className="ph-value">Application-level SQL validation</p>
    {!compact && <p className="ph-muted" style={{ marginTop: 8, fontSize: 14, lineHeight: "20px" }} data-testid={`${testid}-label`}><span className="ph-check__mark" aria-hidden="true" data-testid={`${testid}-icon`} />Validation checkpoint</p>}
  </div>
);

export const SqlDisclosure = ({ fixture, onToggle, testid = "sql-disclosure" }) => (
  <details className="ph-details" onToggle={onToggle} data-testid={testid}>
    <summary data-testid={`${testid}-toggle`}>Query preview · illustrative</summary>
    <div className="ph-details__body">
      <p className="ph-caption" style={{ margin: "0 0 8px" }}>{SQL_LABEL} · {fixture.sqlCaption}</p>
      <pre className="ph-sql ph-mono" tabIndex={0} data-testid={`${testid}-code`}>{fixture.sql}</pre>
    </div>
  </details>
);

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
