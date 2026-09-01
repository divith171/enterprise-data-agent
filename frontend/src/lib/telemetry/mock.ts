import type {
  EndpointHealth,
  Hotspot,
  LatencyPoint,
  ObservabilityOverview,
  PipelineGroup,
  RequestTrace,
  TimeRange,
  TraceSpan,
} from "./types";

/** Deterministic-per-range PRNG so a range switch reshapes the series reproducibly. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const RANGE_SHAPE: Record<TimeRange, { points: number; stepMs: number; seed: number; fmt: "time" | "day" }> = {
  "1h": { points: 12, stepMs: 5 * 60_000, seed: 11, fmt: "time" },
  "6h": { points: 18, stepMs: 20 * 60_000, seed: 27, fmt: "time" },
  "24h": { points: 24, stepMs: 60 * 60_000, seed: 43, fmt: "time" },
  "7d": { points: 28, stepMs: 6 * 60 * 60_000, seed: 61, fmt: "day" },
};

function label(d: Date, fmt: "time" | "day") {
  if (fmt === "day") {
    return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${String(d.getHours()).padStart(2, "0")}h`;
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function round(v: number, d = 2) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function buildSeries(range: TimeRange, now: number): LatencyPoint[] {
  const shape = RANGE_SHAPE[range];
  const rand = rng(shape.seed);
  const out: LatencyPoint[] = [];
  let drift = 0;
  for (let i = shape.points - 1; i >= 0; i--) {
    const d = new Date(now - i * shape.stepMs);
    drift += (rand() - 0.45) * 2.4;
    drift = Math.max(-6, Math.min(7, drift));
    const wave = Math.sin((shape.points - i) / 2.6) * 2.1;
    const avg = 27.54 + drift + wave;
    const p50 = avg - 3.1 - rand() * 1.6;
    const p95 = avg + 7.4 + rand() * 2.9;
    out.push({
      t: d.toISOString(),
      label: label(d, shape.fmt),
      avg: round(Math.max(4, avg)),
      p50: round(Math.max(3, p50)),
      p95: round(Math.max(6, p95)),
    });
  }
  return out;
}

const ENDPOINT_BASE: EndpointHealth[] = [
  {
    path: "/query",
    requests: 10,
    success: 10,
    failures: 0,
    avg: 27.54,
    p50: 24.31,
    p95: 36.24,
    max: 41.08,
    primary: true,
  },
  { path: "/docs", requests: 6, success: 6, failures: 0, avg: 0.021, p50: 0.018, p95: 0.037, max: 0.044, primary: false },
  {
    path: "/openapi.json",
    requests: 4,
    success: 4,
    failures: 0,
    avg: 0.052,
    p50: 0.049,
    p95: 0.074,
    max: 0.081,
    primary: false,
  },
  {
    path: "/observability/overview",
    requests: 18,
    success: 18,
    failures: 0,
    avg: 0.014,
    p50: 0.012,
    p95: 0.026,
    // Max is not instrumented for this endpoint yet — null renders as "No data", never 0.
    max: null,
    primary: false,
  },
];

const PIPELINE_BASE: PipelineGroup[] = [
  {
    name: "Understanding",
    executions: 10,
    avg: 1.76,
    p95: 2.94,
    failures: 0,
    stages: [
      { name: "Intent Classification", executions: 10, avg: 2.7, p95: 3.61, failures: 0 },
      { name: "Entity Extraction", executions: 10, avg: 0.84, p95: 1.22, failures: 0 },
      { name: "Question Rewrite", executions: 10, avg: 0.61, p95: 0.98, failures: 0 },
    ],
  },
  {
    name: "Retrieval",
    executions: 10,
    avg: 0.37,
    p95: 0.62,
    failures: 0,
    stages: [
      { name: "Schema Lookup", executions: 10, avg: 0.21, p95: 0.34, failures: 0 },
      { name: "Vector Search", executions: 10, avg: 0.44, p95: 0.71, failures: 0 },
      { name: "Context Assembly", executions: 10, avg: 0.28, p95: 0.4, failures: 0 },
    ],
  },
  {
    name: "Planning",
    executions: 10,
    avg: 3.71,
    p95: 5.88,
    failures: 0,
    stages: [
      { name: "Business Intent", executions: 10, avg: 5.72, p95: 7.41, failures: 0 },
      { name: "Reasoning", executions: 10, avg: 4.75, p95: 6.12, failures: 0 },
      { name: "Join Strategy", executions: 10, avg: 1.12, p95: 1.68, failures: 0 },
    ],
  },
  {
    name: "Validation",
    executions: 10,
    avg: 2.74,
    p95: 4.31,
    failures: 0,
    stages: [
      { name: "SQL Review", executions: 10, avg: 3.8, p95: 4.92, failures: 0 },
      { name: "Guardrail Check", executions: 10, avg: 1.34, p95: 2.05, failures: 0 },
      { name: "Dry Run", executions: 10, avg: 0.91, p95: 1.4, failures: 0 },
    ],
  },
  {
    name: "Generation",
    executions: 10,
    avg: 1.01,
    p95: 1.74,
    failures: 0,
    stages: [
      { name: "SQL Synthesis", executions: 10, avg: 1.42, p95: 2.11, failures: 0 },
      { name: "Result Narration", executions: 10, avg: 0.68, p95: 1.09, failures: 0 },
    ],
  },
];

const HOTSPOT_BASE: Omit<Hotspot, "share">[] = [
  { stage: "Business Intent", group: "Planning", avg: 5.72, p95: 7.41, executions: 10, label: "Slowest" },
  { stage: "Reasoning", group: "Planning", avg: 4.75, p95: 6.12, executions: 10, label: "High latency" },
  { stage: "SQL Review", group: "Validation", avg: 3.8, p95: 4.92, executions: 10, label: "High latency" },
  { stage: "Intent Classification", group: "Understanding", avg: 2.7, p95: 3.61, executions: 10, label: "Elevated" },
];

const QUESTIONS = [
  "What was net revenue by region last quarter?",
  "Show top 10 customers by lifetime value",
  "Which SKUs dropped more than 20% week over week?",
  "Average order value by acquisition channel in 2025",
  "How many active subscriptions churned last month?",
  "Compare warehouse fulfilment times across regions",
  "Daily signups trend for the enterprise tier",
  "Which sales reps missed quota two quarters in a row?",
  "Refund rate by product category, last 90 days",
  "Monthly gross margin split by business unit",
];

const SQL_SAMPLE = `SELECT r.region_name,
       SUM(o.net_amount) AS net_revenue,
       COUNT(DISTINCT o.order_id) AS orders
FROM analytics.orders o
JOIN analytics.regions r
  ON r.region_id = o.region_id
WHERE o.order_date >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '3 months')
  AND o.order_date <  DATE_TRUNC('quarter', CURRENT_DATE)
  AND o.status = 'COMPLETED'
GROUP BY r.region_name
ORDER BY net_revenue DESC;`;

function buildSpans(rand: () => number): { spans: TraceSpan[]; total: number } {
  let cursor = 0;
  const spans: TraceSpan[] = [];
  for (const group of PIPELINE_BASE) {
    for (const stage of group.stages) {
      const base = (stage.avg ?? 0.5) * 1000;
      const durationMs = Math.round(base * (0.7 + rand() * 0.6));
      spans.push({ name: stage.name, group: group.name, startMs: cursor, durationMs });
      cursor += durationMs;
    }
  }
  const sqlMs = Math.round(486 * (0.6 + rand() * 0.9));
  spans.push({ name: "SQL Execution", group: "Execution", startMs: cursor, durationMs: sqlMs });
  cursor += sqlMs;
  const narrateMs = Math.round(700 * (0.6 + rand() * 0.8));
  spans.push({ name: "Result Generation", group: "Execution", startMs: cursor, durationMs: narrateMs });
  cursor += narrateMs;
  return { spans, total: cursor };
}

function buildTraces(range: TimeRange, now: number): RequestTrace[] {
  const rand = rng(RANGE_SHAPE[range].seed * 7 + 3);
  const stepMs = RANGE_SHAPE[range].stepMs * 1.5;
  return QUESTIONS.map((question, i) => {
    const { spans, total } = buildSpans(rand);
    const sqlSpan = spans.find((s) => s.name === "SQL Execution");
    return {
      id: `trc_${range}_${String(i + 1).padStart(4, "0")}`,
      question,
      status: "success" as const,
      startedAt: new Date(now - (QUESTIONS.length - i) * stepMs).toISOString(),
      totalSeconds: round(total / 1000),
      sqlSeconds: sqlSpan ? round(sqlSpan.durationMs / 1000, 3) : null,
      rows: Math.round(12 + rand() * 4200),
      retries: 0,
      sql: SQL_SAMPLE,
      spans,
    };
  }).reverse();
}

export function buildMockOverview(range: TimeRange): ObservabilityOverview {
  const now = Date.now();
  const series = buildSeries(range, now);
  const avgs = series.map((p) => p.avg ?? 0);
  const p95s = series.map((p) => p.p95 ?? 0);
  const p50s = series.map((p) => p.p50 ?? 0);
  const mean = (xs: number[]) => round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));

  const pipelineTotal = PIPELINE_BASE.reduce((a, g) => a + (g.avg ?? 0), 0);
  const hotspots: Hotspot[] = HOTSPOT_BASE.map((h) => ({
    ...h,
    share: Math.min(1, (h.avg ?? 0) / Math.max(pipelineTotal, 1)),
  }));

  return {
    generatedAt: new Date(now).toISOString(),
    range,
    status: "healthy",
    requests: { total: 10, successful: 10, failed: 0, retried: 0 },
    latency: { p95: Math.max(...p95s) > 0 ? round(Math.max(...p95s)) : null, avg: mean(avgs), p50: mean(p50s) },
    sql: { avg: 0.486, p95: 0.874, executions: 10 },
    series,
    endpoints: ENDPOINT_BASE,
    pipeline: PIPELINE_BASE,
    hotspots,
    traces: buildTraces(range, now),
  };
}
