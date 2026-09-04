// Normalized frontend telemetry model. Components consume ONLY this shape — raw API
// parsing lives exclusively in ./mapper.ts, behind ./source.ts.

export type TimeRange = "1h" | "6h" | "24h" | "7d";

export const TIME_RANGES: TimeRange[] = ["1h", "6h", "24h", "7d"];

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1h": "Last hour",
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
};

export type SystemStatus = "healthy" | "degraded" | "unhealthy";

/** A metric that may legitimately be 0, or be genuinely unrecorded (null → "Not available"). */
export type Metric = number | null;

/** Percentages are normalized to 0–100 by the mapper, always computed from raw counts. */
export type Percent = Metric;

export interface LatencySummary {
  avg: Metric;
  p50: Metric;
  p95: Metric;
  max: Metric;
}

export interface LatencyPoint {
  t: string;
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
  successRate: Percent;
  failureRate: Percent;
}

export interface ErrorType {
  name: string;
  count: number;
  share: Percent;
}

export interface ErrorSummary {
  total: Metric;
  rate: Percent;
  types: ErrorType[];
}

export interface RetrySummary {
  totalRequests: Metric;
  firstAttemptSuccesses: Metric;
  requestsRetried: Metric;
  totalRetries: Metric;
  retryRate: Percent;
  averageAttempts: Metric;
  maxAttempts: Metric;
  /** Requests that still failed after every attempt, when derivable from counts. */
  failedAfterRetry: Metric;
}

export interface SqlSummary {
  executions: Metric;
  successful: Metric;
  failed: Metric;
  successRate: Percent;
  avg: Metric;
  p50: Metric;
  p95: Metric;
  max: Metric;
  avgRows: Metric;
  p50Rows: Metric;
  maxRows: Metric;
  emptyResults: Metric;
  emptyResultRate: Percent;
}

export interface EndpointHealth {
  path: string;
  requests: Metric;
  success: Metric;
  failures: Metric;
  successRate: Percent;
  avg: Metric;
  p50: Metric;
  p95: Metric;
  max: Metric;
  /** The primary AI workload route, emphasised but never shown in isolation. */
  primary: boolean;
}

export interface Stage {
  /** Raw key from the backend, e.g. "business_intent". Stable identity. */
  key: string;
  /** Display label, e.g. "Business Intent". */
  name: string;
  /** Owning group key, e.g. "planning". */
  group: string;
  groupName: string;
  executions: Metric;
  successCount: Metric;
  failures: Metric;
  successRate: Percent;
  avg: Metric;
  p50: Metric;
  p95: Metric;
  max: Metric;
}

export interface PipelineGroup {
  key: string;
  name: string;
  executions: Metric;
  successCount: Metric;
  failures: Metric;
  successRate: Percent;
  avg: Metric;
  p50: Metric;
  p95: Metric;
  stages: Stage[];
}

export type TraceStatus = "success" | "failed" | "retried";

export interface TraceSpan {
  name: string;
  startMs: number;
  durationMs: number;
  group: string;
}

/**
 * Request-level traces are NOT exposed by the current telemetry source. The type is
 * retained so a future request-traces API can be plugged into the same page.
 */
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

/**
 * One row of an LLM usage breakdown — by provider, by model or by layer. All three
 * breakdowns share this shape, so a single component can render any of them.
 *
 * Cost is an *engineering* figure: an estimate the backend attributes to observed token
 * usage, for spotting which provider/model/layer is consuming budget. It is not billing.
 */
export interface LlmBreakdown {
  /** Raw key from the backend, e.g. "openai" / "gpt-4o-mini" / "planning". Stable identity. */
  key: string;
  /** Display label, e.g. "OpenAI" / "GPT-4o Mini" / "Planning". */
  name: string;
  calls: Metric;
  inputTokens: Metric;
  outputTokens: Metric;
  totalTokens: Metric;
  /** Estimated cost in USD attributed to this row. */
  estimatedCost: Metric;
  avg: Metric;
  p95: Metric;
  /** Derived by the mapper: this row's share of total estimated cost, 0–100. */
  costShare: Percent;
  /** Derived by the mapper: estimated cost per call, USD. */
  costPerCall: Metric;
  /** Derived by the mapper: estimated cost per 1,000 tokens, USD. */
  costPer1kTokens: Metric;
  /** Derived by the mapper: average total tokens per call. */
  tokensPerCall: Metric;
}

/**
 * Aggregate LLM provider usage and cost for the current telemetry window.
 * `latency` reuses LatencySummary because the backend reports the same four figures.
 */
export interface LlmSummary {
  calls: Metric;
  successful: Metric;
  failed: Metric;
  successRate: Percent;
  inputTokens: Metric;
  outputTokens: Metric;
  totalTokens: Metric;
  /** Total estimated cost in USD across every call. */
  estimatedCost: Metric;
  latency: LatencySummary;
  byProvider: LlmBreakdown[];
  byModel: LlmBreakdown[];
  byLayer: LlmBreakdown[];
}

/**
 * What the active telemetry source can actually answer. Screens read these flags to
 * render an intentional "not available from this source" state instead of a fake value.
 */
export interface TelemetryAvailability {
  latencySeries: boolean;
  requestTraces: boolean;
  queryLevelSql: boolean;
  activityLog: boolean;
  alertRecords: boolean;
  /**
   * True when the source reports LLM provider usage and cost.
   * Optional only until the mapper and mock providers set it in Step 2.
   */
  llmUsage?: boolean;
  /** True only when the source itself filtered by the selected range. */
  rangeFiltered: boolean;
}

export interface ObservabilityOverview {
  generatedAt: string;
  range: TimeRange;
  status: SystemStatus;
  requests: RequestTotals;
  /** AI request latency (the /query workload). */
  latency: LatencySummary;
  /** All HTTP traffic, which includes non-AI routes. */
  httpLatency: LatencySummary;
  errors: ErrorSummary;
  retries: RetrySummary;
  sql: SqlSummary;
  endpoints: EndpointHealth[];
  pipeline: PipelineGroup[];
  /** Flattened stage list across every group, for ranking and tables. */
  stages: Stage[];
  series: LatencyPoint[];
  traces: RequestTrace[];
  /**
   * LLM provider usage and cost. `null` when the source does not report an `llm` object,
   * so screens can show an honest empty state instead of zeros.
   * Optional only until the mapper and mock providers populate it in Step 2.
   */
  llm?: LlmSummary | null;
  availability: TelemetryAvailability;
}
