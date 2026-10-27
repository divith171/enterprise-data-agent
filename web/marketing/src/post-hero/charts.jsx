import { fmt } from "./demoFixtures";

const pctPos = (v, [lo, hi]) => ((v - lo) / (hi - lo)) * 100;

/* Regional: signed horizontal bars, zero baseline, fixed domain −50..250 ($k) */
export const SignedBars = ({ fixture, animate = false, highlightId = null, compact = false, showAxis = true }) => {
  const { domain, ticks, axisTitle, emphasisId } = fixture.chart;
  const zero = pctPos(0, domain);
  return (
    <div data-testid="chart-signed-bars">
      <div className="ph-bars" role="img" aria-label={`${axisTitle}. ${fixture.rows.map((r) => `${r.label} ${fmt.signedK(r.change)}`).join(", ")}.`}>
        {fixture.rows.map((r, i) => {
          const v = r.change / 1000;
          const left = Math.min(zero, pctPos(v, domain));
          const width = Math.abs(pctPos(v, domain) - zero);
          return (
            <div key={r.id} className={`ph-bar-row ${r.id === emphasisId ? "is-hot" : ""} ${highlightId === r.id ? "is-hi" : ""}`} data-testid={`bar-${r.id}`}>
              <span>{r.label}</span>
              <div className="ph-bar-track">
                <span className="ph-bar-zero" style={{ left: `${zero}%` }} aria-hidden="true" />
                <span
                  className={`ph-bar-fill ${v < 0 ? "ph-bar-fill--neg" : ""} ${animate ? "ph-bar-fill--anim" : ""}`}
                  style={{ left: `${left}%`, width: `${width}%`, "--i": i, "--origin": v < 0 ? "right" : "left" }}
                  aria-hidden="true"
                />
              </div>
              <span className="ph-bar-val">{fmt.signedK(r.change).replace("$", "").replace("k", "")}</span>
            </div>
          );
        })}
      </div>
      {showAxis && (
        <div className="ph-axis" aria-hidden="true">
          <span />
          <div className="ph-axis__ticks">
            {ticks.map((t) => (
              <span key={t} style={{ left: `${pctPos(t, domain)}%` }}>{t < 0 ? `−${Math.abs(t)}` : t}</span>
            ))}
          </div>
          <span />
        </div>
      )}
      {!compact && <p className="ph-axis-title">{axisTitle}</p>}
    </div>
  );
};

/* Customer: three-row trend table with sparklines on a common 0–130k scale */
export const TrendTable = ({ fixture, animate = false, highlightId = null }) => {
  const [lo, hi] = fixture.chart.domain;
  const y = (v) => 20 - ((v / 1000 - lo) / (hi - lo)) * 18;
  return (
    <div className="ph-table-scroll" tabIndex={0} data-testid="customer-trend-scroll">
    <table className="ph-table ph-trend" data-testid="chart-trend-table">
      <thead>
        <tr>
          <th scope="col">Customer</th>
          {fixture.monthShort.map((m) => <th key={m} scope="col">{m}</th>)}
          <th scope="col"><span className="ph-sr">Trend</span></th>
          <th scope="col">Two declines</th>
        </tr>
      </thead>
      <tbody>
        {fixture.rows.map((r, i) => (
          <tr key={r.id} className={r.matches ? "is-hot" : ""} data-testid={`trend-${r.id}`} style={highlightId === r.id ? { outline: "1px solid #19CDE7", outlineOffset: -1 } : undefined}>
            <td>{r.label}</td>
            {r.months.map((m, j) => <td key={j}>{fmt.k(m)}</td>)}
            <td>
              <svg className="ph-spark" viewBox="0 0 72 22" aria-hidden="true">
                <polyline
                  className={animate ? "ph-draw" : ""}
                  style={{ "--len": 90, animationDelay: `${i * 60}ms` }}
                  fill="none"
                  stroke={r.matches ? "#19CDE7" : "#B6C6D6"}
                  strokeWidth="1.5"
                  points={r.months.map((m, j) => `${4 + j * 32},${y(m)}`).join(" ")}
                />
              </svg>
            </td>
            <td><span className={`ph-flag ${r.matches ? "ph-flag--yes" : ""}`}>{r.matches ? "Yes" : "No"}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
};

/* Weekly: three paired vertical bars on a common 0–120k scale */
export const PairedBars = ({ fixture, animate = false, highlightId = null }) => {
  const [, hi] = fixture.chart.domain;
  const h = (v) => `${(v / 1000 / hi) * 100}%`;
  return (
    <div data-testid="chart-paired-bars">
      <div className="ph-pairs" role="img" aria-label={`Matched weekdays. ${fixture.rows.map((r) => `${r.label}: ${fmt.k(r.prior)} prior, ${fmt.k(r.current)} current`).join("; ")}.`}>
        {fixture.rows.map((r, i) => (
          <div key={r.id} className="ph-pair" data-testid={`pair-${r.id}`}>
            <div className="ph-pair__bars">
              <div className={`ph-vbar ph-vbar--prior ${animate ? "ph-vbar--anim" : ""}`} style={{ height: h(r.prior), "--i": i * 2 }}><span>{fmt.k(r.prior)}</span></div>
              <div className={`ph-vbar ph-vbar--cur ${animate ? "ph-vbar--anim" : ""} ${highlightId === r.id ? "is-hi" : ""}`} style={{ height: h(r.current), "--i": i * 2 + 1 }}><span>{fmt.k(r.current)}</span></div>
            </div>
            <div className="ph-pair__label">{r.label}</div>
          </div>
        ))}
      </div>
      <div className="ph-legend" aria-hidden="true">
        <span><i style={{ background: "rgba(182,198,214,0.4)" }} />{fixture.periods.prior}</span>
        <span><i style={{ background: "#19CDE7" }} />{fixture.periods.current}</span>
      </div>
    </div>
  );
};

/* Margin: three paired horizontal markers on 0–100% */
export const MarginMarkers = ({ fixture, animate = false, highlightId = null }) => (
  <div className="ph-markers" data-testid="chart-margin-markers" role="img" aria-label={`Gross margin by category. ${fixture.rows.map((r) => `${r.label} ${(r.m2 * 100).toFixed(0)}% to ${(r.m3 * 100).toFixed(0)}%`).join("; ")}.`}>
    {fixture.rows.map((r, i) => {
      const a = r.m2 * 100, b = r.m3 * 100;
      return (
        <div key={r.id} className={`ph-marker-row ${r.id === fixture.chart.emphasisId ? "is-hot" : ""} ${highlightId === r.id ? "is-hi" : ""}`} data-testid={`margin-${r.id}`}>
          <span>{r.label}</span>
          <div className="ph-marker-track">
            {a !== b && <span className={`ph-marker-link ${animate ? "ph-bar-fill--anim" : ""}`} style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%`, "--i": i, "--origin": b < a ? "right" : "left" }} aria-hidden="true" />}
            <span className="ph-marker ph-marker--prior" style={{ left: `${a}%` }} aria-hidden="true" />
            <span className="ph-marker ph-marker--cur" style={{ left: `${b}%` }} aria-hidden="true" />
          </div>
          <span className="ph-marker-vals">{a.toFixed(0)}% → {b.toFixed(0)}% · {fixture.ppText(r.pp)}</span>
        </div>
      );
    })}
    <div className="ph-legend" aria-hidden="true">
      <span><i style={{ background: "rgba(182,198,214,0.6)" }} />{fixture.periods.prior}</span>
      <span><i style={{ background: "#19CDE7" }} />{fixture.periods.current}</span>
      <span>0–100% scale</span>
    </div>
  </div>
);

export const PreviewChart = ({ fixture, ...rest }) => {
  switch (fixture.chart.type) {
    case "signed-bars": return <SignedBars fixture={fixture} {...rest} />;
    case "trend-table": return <TrendTable fixture={fixture} {...rest} />;
    case "paired-bars": return <PairedBars fixture={fixture} {...rest} />;
    default: return <MarginMarkers fixture={fixture} {...rest} />;
  }
};

/* Equivalent tabular data for every chart */
export const SampleDataTable = ({ fixture, compact = false }) => {
  const cls = `ph-table ${compact ? "ph-table--compact" : ""}`;
  if (fixture.id === "regional-growth") {
    return (
      <table className={cls} data-testid="sample-data-regional">
        <thead><tr><th scope="col">Region</th><th scope="col">Q2 2026</th><th scope="col">Q3 2026</th><th scope="col">Change</th><th scope="col">Growth</th><th scope="col">Contribution</th></tr></thead>
        <tbody>
          {fixture.rows.map((r) => (
            <tr key={r.id}><td>{r.label}</td><td>{fmt.money(r.q2)}</td><td>{fmt.money(r.q3)}</td><td>{r.change < 0 ? "−" : "+"}{fmt.money(Math.abs(r.change))}</td><td>{fmt.pctOrUndefined(r.growth)}</td><td>{fmt.pctOrUndefined(r.contribution, 1, false).replace("+", "")}{r.contribution < 0 ? "" : ""}</td></tr>
          ))}
          <tr className="is-total"><td>Total</td><td>{fmt.money(fixture.total.q2)}</td><td>{fmt.money(fixture.total.q3)}</td><td>+{fmt.money(fixture.total.change)}</td><td>{fmt.pctOrUndefined(fixture.total.growth)}</td><td>100.0%</td></tr>
        </tbody>
      </table>
    );
  }
  if (fixture.id === "customer-decline") {
    return (
      <table className={cls} data-testid="sample-data-customer">
        <thead><tr><th scope="col">Customer</th>{fixture.monthLabels.map((m) => <th key={m} scope="col">{m}</th>)}<th scope="col">Two declines</th></tr></thead>
        <tbody>{fixture.rows.map((r) => <tr key={r.id}><td>{r.label}</td>{r.months.map((m, i) => <td key={i}>{fmt.k(m)}</td>)}<td>{r.matches ? "Yes" : "No"}</td></tr>)}</tbody>
      </table>
    );
  }
  if (fixture.id === "weekly-change") {
    return (
      <table className={cls} data-testid="sample-data-weekly">
        <thead><tr><th scope="col">Matched weekday</th><th scope="col">{fixture.periods.prior}</th><th scope="col">{fixture.periods.current}</th><th scope="col">Change</th></tr></thead>
        <tbody>
          {fixture.rows.map((r) => <tr key={r.id}><td>{r.label}</td><td>{fmt.k(r.prior)}</td><td>{fmt.k(r.current)}</td><td>{fmt.signedK(r.change)}</td></tr>)}
          <tr className="is-total"><td>Total</td><td>{fmt.k(fixture.total.prior)}</td><td>{fmt.k(fixture.total.current)}</td><td>{fmt.signedK(fixture.total.change)}</td></tr>
        </tbody>
      </table>
    );
  }
  return (
    <table className={cls} data-testid="sample-data-margin">
      <thead><tr><th scope="col">Category</th><th scope="col">Q2 rev</th><th scope="col">Q2 cost</th><th scope="col">Q2 GM</th><th scope="col">Q3 rev</th><th scope="col">Q3 cost</th><th scope="col">Q3 GM</th><th scope="col">Change</th></tr></thead>
      <tbody>{fixture.rows.map((r) => <tr key={r.id}><td>{r.label}</td><td>{fmt.k(r.q2.rev)}</td><td>{fmt.k(r.q2.cost)}</td><td>{(r.m2 * 100).toFixed(0)}%</td><td>{fmt.k(r.q3.rev)}</td><td>{fmt.k(r.q3.cost)}</td><td>{(r.m3 * 100).toFixed(0)}%</td><td>{fixture.ppText(r.pp)}</td></tr>)}</tbody>
    </table>
  );
};
