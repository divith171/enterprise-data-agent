import { useEffect, useState } from "react";
import { SOURCE, SQL_LABEL, fmt } from "./demoFixtures";
import { SqlDisclosure, ValidationCheckpoint } from "./frameStates";

export const PHASES = [
  { id: "interpret", n: "01", label: "Interpret" },
  { id: "ground", n: "02", label: "Ground" },
  { id: "compute", n: "03", label: "Compute" },
  { id: "explain", n: "04", label: "Explain" },
];

const useMedia = (q) => {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const fn = (e) => setM(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [q]);
  return m;
};

/* Output table columns per fixture; `tags` link a column to calculation inputs/outputs */
const COLUMNS = {
  "regional-growth": (f) => ({
    cols: [
      { h: "Region", tags: [], get: (r) => r.label },
      { h: f.periods.prior, tags: ["q2"], get: (r) => fmt.k(r.q2) },
      { h: f.periods.current, tags: ["q3"], get: (r) => fmt.k(r.q3) },
      { h: "Change", tags: ["change"], get: (r) => fmt.signedK(r.change) },
      { h: "Contribution", tags: ["contribution"], get: (r) => fmt.pctOrUndefined(r.contribution, 1, false) },
    ],
    rows: f.rows,
  }),
  "customer-decline": (f) => ({
    cols: [
      { h: "Customer", tags: [], get: (r) => r.label },
      ...f.monthShort.map((m, i) => ({ h: m, tags: ["months"], get: (r) => fmt.k(r.months[i]) })),
      { h: "Two declines", tags: ["declines"], get: (r) => (r.matches ? "Yes" : "No") },
    ],
    rows: f.rows,
  }),
  "weekly-change": (f) => ({
    cols: [
      { h: "Weekday", tags: [], get: (r) => r.label },
      { h: f.periods.prior, tags: ["prior"], get: (r) => fmt.k(r.prior) },
      { h: f.periods.current, tags: ["current"], get: (r) => fmt.k(r.current) },
      { h: "Change", tags: ["change", "total"], get: (r) => fmt.signedK(r.change) },
    ],
    rows: [...f.rows, { id: "total", label: "Total", ...f.total }],
  }),
  "margin-loss": (f) => ({
    cols: [
      { h: "Category", tags: [], get: (r) => r.label },
      { h: `${f.periods.prior} GM`, tags: ["q2", "m2"], get: (r) => `${(r.m2 * 100).toFixed(0)}%` },
      { h: `${f.periods.current} GM`, tags: ["q3", "m3"], get: (r) => `${(r.m3 * 100).toFixed(0)}%` },
      { h: "Change", tags: ["pp"], get: (r) => f.ppText(r.pp) },
    ],
    rows: f.rows,
  }),
};

const OutputTable = ({ fixture, hotTags }) => {
  const { cols, rows } = COLUMNS[fixture.id](fixture);
  const hot = (c) => c.tags.some((t) => hotTags.includes(t));
  return (
    <table className="ph-table ph-table--compact" data-testid="trace-output-table">
      <thead><tr>{cols.map((c) => <th key={c.h} scope="col" className={hot(c) ? "is-hi" : ""}>{c.h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className={r.id === "total" ? "is-total" : ""}>
            {cols.map((c) => <td key={c.h} className={hot(c) ? "is-hi" : ""}>{c.get(r)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const evidence = (f) => {
  switch (f.id) {
    case "regional-growth": return f.rows.map((r) => ({ id: r.id, text: `${r.label} ${fmt.signedK(r.change)} · ${fmt.pctOrUndefined(r.contribution, 1, false)}` }));
    case "customer-decline": return f.rows.map((r) => ({ id: r.id, text: `${r.label} ${r.months.map((m) => fmt.k(m)).join(" → ")}` }));
    case "weekly-change": return f.rows.map((r) => ({ id: r.id, text: `${r.label} ${fmt.k(r.prior)} → ${fmt.k(r.current)}` }));
    default: return f.rows.map((r) => ({ id: r.id, text: `${r.label} ${(r.m2 * 100).toFixed(0)}% → ${(r.m3 * 100).toFixed(0)}%` }));
  }
};

const Inspector = ({ phase, fixture, calcId, setCalcId, highlightId, setHighlightId, metricHot, setMetricHot }) => {
  const ctx = <small>{fixture.question}</small>;
  if (phase === "interpret") {
    const [metric, period, compare] = [fixture.interpretation[0], fixture.interpretation[2], fixture.interpretation[3]];
    return (
      <>
        <h4 className="ph-inspector__title">Interpretation {ctx}</h4>
        <dl className="ph-kv">
          <div><dt>Metric definition</dt><dd><button type="button" className={`ph-chip ph-chip--btn ${metricHot ? "ph-chip--cyan" : ""}`} aria-pressed={metricHot} onClick={() => setMetricHot((v) => !v)} data-testid="trace-metric-button">{metric.value}</button></dd></div>
          <div><dt>Period</dt><dd>{period.value}</dd></div>
          <div><dt>Comparison</dt><dd>{compare.value}</dd></div>
          <div><dt>Assumption</dt><dd style={{ textAlign: "left" }}>{fixture.assumption}</dd></div>
        </dl>
        <p className="ph-caption">{fixture.definition}</p>
      </>
    );
  }
  if (phase === "ground") {
    const fields = [...fixture.fields, ...(fixture.joinFields || [])];
    return (
      <>
        <h4 className="ph-inspector__title">Grounding {ctx}</h4>
        <dl className="ph-kv">
          <div><dt>Sample source</dt><dd>{SOURCE.workspace} · {SOURCE.label}</dd></div>
          <div><dt>Required fields</dt><dd><ul className="ph-chips" style={{ justifyContent: "flex-end" }}>{fields.map((x) => <li key={x} className="ph-chip ph-chip--cyan ph-mono">{x}</li>)}</ul></dd></div>
          <div><dt>Relationship</dt><dd className="ph-mono">{fixture.relationship || "Single table · no join required"}</dd></div>
        </dl>
        {fixture.relationship && (
          <svg viewBox="0 0 320 44" width="100%" height="44" aria-hidden="true" data-testid="trace-relationship-connector">
            <rect x="1" y="8" width="130" height="28" rx="6" fill="#0B2942" stroke="#26394D" />
            <text x="66" y="26" textAnchor="middle" fill="#F3F7FB" fontSize="12" fontFamily="ui-monospace, monospace">revenue_records</text>
            <rect x="189" y="8" width="130" height="28" rx="6" fill="#0B2942" stroke="#26394D" />
            <text x="254" y="26" textAnchor="middle" fill="#F3F7FB" fontSize="12" fontFamily="ui-monospace, monospace">customers</text>
            <path className="ph-draw" style={{ "--len": 70 }} d="M131 22 H185" stroke="#19CDE7" strokeWidth="1.5" fill="none" markerEnd="url(#ph-arrow)" />
            <defs><marker id="ph-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#19CDE7" /></marker></defs>
          </svg>
        )}
        <p className="ph-caption">Only the fields needed for this question are read. Sample schema names, not production tables.</p>
      </>
    );
  }
  if (phase === "compute") {
    const calc = fixture.calculation.find((c) => c.id === calcId);
    const hotTags = calc ? [...calc.inputs, calc.output] : [];
    return (
      <>
        <h4 className="ph-inspector__title">Computation {ctx}</h4>
        <p className="ph-label">Calculation</p>
        <ol className="ph-calc" data-testid="trace-calculations">
          {fixture.calculation.map((c, i) => (
            <li key={c.id}><button type="button" aria-pressed={calcId === c.id} onClick={() => setCalcId(calcId === c.id ? null : c.id)} data-testid={`trace-calc-${c.id}`}><span>0{i + 1}</span><span>{c.label}</span></button></li>
          ))}
        </ol>
        <p className="ph-label">Sample output</p>
        <OutputTable fixture={fixture} hotTags={hotTags} />
        <ValidationCheckpoint compact />
        <SqlDisclosure fixture={fixture} testid="trace-sql-disclosure" />
        <p className="ph-caption">{SQL_LABEL}. Validation is a checkpoint, not a verified pass.</p>
      </>
    );
  }
  return (
    <>
      <h4 className="ph-inspector__title">Explanation {ctx}</h4>
      <p className="ph-label">Answer</p>
      <p className="ph-answer ph-answer--compact" data-testid="trace-answer">{fixture.answer}</p>
      <p className="ph-label">Supporting values</p>
      <ul className="ph-chips" data-testid="trace-evidence">
        {evidence(fixture).map((e) => (
          <li key={e.id}><button type="button" className={`ph-chip ph-chip--btn ${highlightId === e.id ? "ph-chip--cyan" : ""}`} aria-pressed={highlightId === e.id} onClick={() => setHighlightId(highlightId === e.id ? null : e.id)} data-testid={`trace-evidence-${e.id}`}>{e.text}</button></li>
        ))}
      </ul>
      <p className="ph-label">Scope</p>
      <p className="ph-caption" style={{ margin: 0, fontSize: 14, lineHeight: "20px" }}>{fixture.scope}</p>
    </>
  );
};

export const AnalysisTrace = ({ fixture, activePhase, setActivePhase, highlightId, setHighlightId, metricHot, setMetricHot, headingRef, motion }) => {
  const wide = useMedia("(min-width: 768px)");
  const [calcId, setCalcId] = useState(null);
  useEffect(() => { setCalcId(null); }, [fixture.id]);

  const node = (p, extraStyle) => (
    <button key={p.id} type="button" className="ph-node" aria-pressed={activePhase === p.id} onClick={() => setActivePhase(p.id)} style={extraStyle} data-testid={`trace-phase-${p.id}`}>
      <small>{wide ? p.label.toUpperCase() : `Step ${p.n}`}</small>
      <span>{wide ? `${p.n} · ${["Fields and assumption", "Source and relationship", "Calculation and checkpoint", "Answer and scope"][PHASES.indexOf(p)]}` : p.label}</span>
    </button>
  );

  return (
    <div className="ph-trace" data-testid="analysis-trace">
      <div className="ph-trace__head">
        <h3 id="trace-heading" ref={headingRef} tabIndex={-1} className="ph-h3">More than text-to-SQL.</h3>
        <p className="ph-caption" style={{ margin: 0 }}>Interpret → Ground → Compute → Explain. Select a phase to inspect its artifacts.</p>
      </div>
      {wide ? (
        <div className="ph-map" data-testid="trace-map">
          <span className={`ph-arrow ph-arrow--h ph-arrow--r ${motion ? "ph-arrow--anim" : ""}`} style={{ top: 48 }} aria-hidden="true" />
          <span className={`ph-arrow ph-arrow--v ${motion ? "ph-arrow--anim" : ""}`} aria-hidden="true" />
          <span className={`ph-arrow ph-arrow--h ph-arrow--l ${motion ? "ph-arrow--anim" : ""}`} style={{ top: 172 }} aria-hidden="true" />
          {node(PHASES[0], { gridColumn: 1, gridRow: 1 })}
          {node(PHASES[1], { gridColumn: 2, gridRow: 1 })}
          {node(PHASES[3], { gridColumn: 1, gridRow: 2 })}
          {node(PHASES[2], { gridColumn: 2, gridRow: 2 })}
        </div>
      ) : (
        <div className="ph-map ph-map--list" data-testid="trace-map-list">{PHASES.map((p) => node(p))}</div>
      )}
      <div key={`${activePhase}-${fixture.id}`} className={`ph-inspector ${motion ? "ph-inspector-enter" : ""}`} data-testid="trace-inspector">
        <Inspector phase={activePhase} fixture={fixture} calcId={calcId} setCalcId={setCalcId} highlightId={highlightId} setHighlightId={setHighlightId} metricHot={metricHot} setMetricHot={setMetricHot} />
      </div>
    </div>
  );
};
