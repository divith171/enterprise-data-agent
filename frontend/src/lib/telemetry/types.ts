// Telemetry contract. These interfaces mirror the shape the real
// GET /observability/overview endpoint is expected to return. Nothing else in the
// app talks to a data source directly — swap the implementation in ./source.ts.

export type TimeRange = "1h" | "6h" | "24h" | "7d";

export const TIME_RANGES: TimeRange[] = ["1h", "6h", "24h", "7d"];

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1h": "Last hour",
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
};

export type SystemStatus = "healthy" | "degraded" | "unhealthy";

/** A metric that may legitimately be 0, or genuinely unrecorded (null → "No data"). */
export type Metric = number | null;

export interface LatencyPoint {
  /** ISO-8601 UTC timestamp of the bucket. */
  t: string;
  /** Short axis label for the bucket. */
  label: string;
  avg: Metric;
  p50: Metric;
  p95: Metric;
}

export interface RequestTotals {
  total: Metric;
  successful: Metric;
  failed: Metric;
  retried: Metric;
}

export interface EndpointHealth {
  path: string;
  requests: Metric;
  success: Metric;
  failures: Metric;
  avg: Metric;
  p50: Metric;
  p95: Metric;
  max: Metric;
  /** Marks the primary AI workload endpoint so the UI can emphasise it. */
  primary: boolean;
}

export interface PipelineSubStage {
  name: string;
  executions: Metric;
  avg: Metric;
  p95: Metric;
  failures: Metric;
}

export interface PipelineGroup {
  name: string;
  executions: Metric;
  avg: Metric;
  p95: Metric;
  failures: Metric;
  stages: PipelineSubStage[];
}

export type HotspotLabel = "Slowest" | "High latency" | "Elevated";

export interface Hotspot {
  stage: string;
  group: string;
  avg: Metric;
  p95: Metric;
  executions: Metric;
  label: HotspotLabel;
  /** Share of the pipeline budget, 0–1. */
  share: number;
}

export type TraceStatus = "success" | "failed" | "retried";

export interface TraceSpan {
  name: string;
  startMs: number;
  durationMs: number;
  group: string;
}

export interface RequestTrace {
  id: string;
  question: string;
  status: TraceStatus;
  startedAt: string;
  totalSeconds: number;
  sqlSeconds: Metric;
  rows: Metric;
  retries: number;
  sql: string;
  spans: TraceSpan[];
}

export interface ObservabilityOverview {
  generatedAt: string;
  range: TimeRange;
  status: SystemStatus;
  requests: RequestTotals;
  latency: { p95: Metric; avg: Metric; p50: Metric };
  sql: { avg: Metric; p95: Metric; executions: Metric };
  series: LatencyPoint[];
  endpoints: EndpointHealth[];
  pipeline: PipelineGroup[];
  hotspots: Hotspot[];
  traces: RequestTrace[];
}
