/**
 * Mock telemetry provider — preserved so the UI can be demoed without a backend.
 * NEVER used when TELEMETRY_MODE is "api"; there is no silent fallback to these values.
 */
import { titleize } from "@/lib/format";
import type {
  EndpointHealth,
  LatencyPoint,
  ObservabilityOverview,
  PipelineGroup,
  RequestTrace,
  Stage,
  TimeRange,
  TraceSpan,
} from "./types";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const RANGE_SHAPE: Record<
  TimeRange,
  { points: number; stepMs: number; seed: number; fmt: "time" | "day" }
> = {
  "1h": { points: 12, stepMs: 5 * 60_000, seed: 11, fmt: "time" },
  "6h": { points: 18, stepMs: 20 * 60_000, seed: 27, fmt: "time" },
  "24h": { points: 24, stepMs: 60 * 60_000, seed: 43, fmt: "time" },
  "7d": { points: 28, stepMs: 6 * 60 * 60_000, seed: 61, fmt: "day" },
};

function axisLabel(d: Date, fmt: "time" | "day") {
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
    drift = Math.max(-6, Math.min(7, drift + (rand() - 0.45) * 2.4));
    const wave = Math.sin((shape.points - i) / 2.6) * 2.1;
    const avg = 27.54 + drift + wave;
    out.push({
      t: d.toISOString(),
      label: axisLabel(d, shape.fmt),
      avg: round(Math.max(4, avg)),
      p50: round(Math.max(3, avg - 3.1 - rand() * 1.6)),
      p95: round(Math.max(6, avg + 7.4 + rand() * 2.9)),
    });
  }
  return out;
}

/** [stageKey, groupKey, avgSeconds, p95Seconds] */
const STAGE_SEED: [string, string, number, number][] = [
  ["business_intent", "planning", 5.72, 7.41],
  ["reasoning", "planning", 4.75, 6.12],
  ["sql_review", "validation", 3.8, 4.92],
  ["intent_classification", "understanding", 2.7, 3.61],
  ["analysis_planner", "planning", 2.31, 3.04],
  ["execution_planner", "planning", 1.94, 2.55],
  ["capability_validation", "validation", 1.34, 2.05],
  ["continuation_detection", "understanding", 0.84, 1.22],
  ["embedding_retrieval", "retrieval", 0.44, 0.71],
  ["sql_generation", "generation", 1.42, 2.11],
  ["query_expansion", "retrieval", 0.28, 0.4],
  ["entity_mapping", "understanding", 0.61, 0.98],
  ["schema_retrieval", "retrieval", 0.21, 0.34],
  ["concept_mapping", "retrieval", 0.19, 0.3],
  ["graph_expansion", "retrieval", 0.24, 0.38],
];

const GROUP_KEYS = ["understanding", "retrieval", "planning", "validation", "generation"];

function buildStages(): Stage[] {
  return STAGE_SEED.map(([key, group, avg, p95]) => ({
    key,
    name: titleize(key),
    group,
    groupName: titleize(group),
    executions: 10,
    successCount: 10,
    failures: 0,
    successRate: 100,
    avg,
    p50: round(avg * 0.94),
    p95,
    max: round(p95 * 1.12),
  }));
}

function buildPipeline(stages: Stage[]): PipelineGroup[] {
  return GROUP_KEYS.map((key) => {
    const groupStages = stages
      .filter((s) => s.group === key)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
    const avg =
      groupStages.length === 0
        ? null
        : round(groupStages.reduce((a, s) => a + (s.avg ?? 0), 0) / groupStages.length);
    const p95 = groupStages.length === 0 ? null : Math.max(...groupStages.map((s) => s.p95 ?? 0));
    return {
      key,
      name: titleize(key),
      executions: groupStages.length * 10,
      successCount: groupStages.length * 10,
      failures: 0,
      successRate: 100,
      avg,
      p50: avg === null ? null : round(avg * 0.94),
      p95,
      stages: groupStages,
    };
  });
}

const ENDPOINTS: EndpointHealth[] = [
  {
    path: "/query",
    requests: 10,
    success: 10,
    failures: 0,
    successRate: 100,
    avg: 27.54,
    p50: 24.31,
    p95: 36.24,
    max: 41.08,
    primary: true,
  },
  {
    path: "/observability/overview",
    requests: 18,
    success: 18,
    failures: 0,
    successRate: 100,
    avg: 0.014,
    p50: 0.012,
    p95: 0.026,
    max: null,
    primary: false,
  },
  {
    path: "/docs",
    requests: 6,
    success: 6,
    failures: 0,
    successRate: 100,
    avg: 0.021,
    p50: 0.018,
    p95: 0.037,
    max: 0.044,
    primary: false,
  },
  {
    path: "/openapi.json",
    requests: 4,
    success: 4,
    failures: 0,
    successRate: 100,
    avg: 0.052,
    p50: 0.049,
    p95: 0.074,
    max: 0.081,
    primary: false,
  },
];

const QUESTIONS = [
  "What was net revenue by region last quarter?",
  "Show top 10 customers by lifetime value",
  "Which SKUs dropped more than 20% week over week?",
  "Average order value by acquisition channel in 2025",
  "How many active subscriptions churned last month?",
];

const SQL_SAMPLE = `SELECT r.region_name,
       SUM(o.net_amount) AS net_revenue,
       COUNT(DISTINCT o.order_id) AS orders
FROM analytics.orders o
JOIN analytics.regions r
  ON r.region_id = o.region_id
WHERE o.order_date >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '3 months')
  AND o.status = 'COMPLETED'
GROUP BY r.region_name
ORDER BY net_revenue DESC;`;

function buildTraces(range: TimeRange, now: number, stages: Stage[]): RequestTrace[] {
  const rand = rng(RANGE_SHAPE[range].seed * 7 + 3);
  const stepMs = RANGE_SHAPE[range].stepMs * 1.5;
  return QUESTIONS.map((question, i) => {
    let cursor = 0;
    const spans: TraceSpan[] = stages.map((s) => {
      const durationMs = Math.round((s.avg ?? 0.5) * 1000 * (0.7 + rand() * 0.6));
      const span = { name: s.name, group: s.groupName, startMs: cursor, durationMs };
      cursor += durationMs;
      return span;
    });
    const sqlMs = Math.round(486 * (0.6 + rand() * 0.9));
    spans.push({ name: "SQL Execution", group: "Execution", startMs: cursor, durationMs: sqlMs });
    cursor += sqlMs;
    return {
      id: `trc_${range}_${String(i + 1).padStart(4, "0")}`,
      question,
      status: "success" as const,
      startedAt: new Date(now - (QUESTIONS.length - i) * stepMs).toISOString(),
      totalSeconds: round(cursor / 1000),
      sqlSeconds: round(sqlMs / 1000, 3),
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
  const stages = buildStages();
  const pipeline = buildPipeline(stages);
  const mean = (xs: number[]) => round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));

  return {
    generatedAt: new Date(now).toISOString(),
    range,
    status: "healthy",
    requests: {
      total: 10,
      successful: 10,
      failed: 0,
      retried: 0,
      successRate: 100,
      failureRate: 0,
    },
    latency: {
      avg: mean(series.map((p) => p.avg ?? 0)),
      p50: mean(series.map((p) => p.p50 ?? 0)),
      p95: Math.max(...series.map((p) => p.p95 ?? 0)),
      max: round(Math.max(...series.map((p) => p.p95 ?? 0)) * 1.13),
    },
    httpLatency: { avg: 9.42, p50: 0.031, p95: 33.1, max: 41.08 },
    errors: { total: 0, rate: 0, types: [] },
    retries: {
      totalRequests: 10,
      firstAttemptSuccesses: 10,
      requestsRetried: 0,
      totalRetries: 0,
      retryRate: 0,
      averageAttempts: 1,
      maxAttempts: 1,
      failedAfterRetry: 0,
    },
    sql: {
      executions: 10,
      successful: 10,
      failed: 0,
      successRate: 100,
      avg: 0.486,
      p50: 0.41,
      p95: 0.874,
      max: 1.22,
      avgRows: 812,
      p50Rows: 400,
      maxRows: 5000,
      emptyResults: 0,
      emptyResultRate: 0,
    },
    endpoints: ENDPOINTS,
    pipeline,
    stages,
    series,
    traces: buildTraces(range, now, stages),
    availability: {
      latencySeries: true,
      requestTraces: true,
      queryLevelSql: false,
      activityLog: false,
      alertRecords: false,
      rangeFiltered: true,
    },
  };
}
