/**
 * Adapter: real backend payload → the existing ObservabilityOverview frontend contract.
 *
 * Rules enforced here:
 *  - Nothing is fabricated. Fields the backend does not provide become null or [] so the
 *    existing "No data" / empty states render.
 *  - Only `series`, `traces` and `hotspots` are unavailable today; every other value is
 *    read straight from the response.
 *  - Durations: the backend reports pipeline timings in MILLISECONDS and request/SQL
 *    timings in SECONDS. Pipeline values are converted to seconds for the UI contract.
 */
import type {
  EndpointHealth,
  ObservabilityOverview,
  PipelineGroup,
  PipelineSubStage,
  SystemStatus,
  TimeRange,
  Metric,
} from "./types";

/* ---------------------------------- raw payload --------------------------------- */

export interface RawLatencyBlock {
  total_requests?: number | null;
  successful_requests?: number | null;
  failed_requests?: number | null;
  success_rate?: number | null;
  failure_rate?: number | null;
  average_latency_seconds?: number | null;
  p50_latency_seconds?: number | null;
  p95_latency_seconds?: number | null;
  max_latency_seconds?: number | null;
  error_types?: Record<string, number> | null;
}

export interface RawEndpoint {
  requests?: number | null;
  successful_requests?: number | null;
  failed_requests?: number | null;
  success_rate?: number | null;
  failure_rate?: number | null;
  average_latency_seconds?: number | null;
  p50_latency_seconds?: number | null;
  p95_latency_seconds?: number | null;
  max_latency_seconds?: number | null;
}

export interface RawRetries {
  total_requests?: number | null;
  first_attempt_successes?: number | null;
  requests_retried?: number | null;
  total_retries?: number | null;
  retry_rate?: number | null;
  average_attempts?: number | null;
  max_attempts?: number | null;
}

export interface RawSqlExecution {
  total_executions?: number | null;
  successful_executions?: number | null;
  failed_executions?: number | null;
  success_rate?: number | null;
  average_execution_seconds?: number | null;
  p50_execution_seconds?: number | null;
  p95_execution_seconds?: number | null;
  max_execution_seconds?: number | null;
  average_rows_returned?: number | null;
  p50_rows_returned?: number | null;
  max_rows_returned?: number | null;
  empty_results?: number | null;
  empty_result_rate?: number | null;
}

export interface RawGroup {
  stage_executions?: number | null;
  success_count?: number | null;
  failure_count?: number | null;
  success_rate?: number | null;
  average_duration_ms?: number | null;
  p50_duration_ms?: number | null;
  p95_duration_ms?: number | null;
}

export interface RawStage {
  group?: string | null;
  executions?: number | null;
  success_count?: number | null;
  failure_count?: number | null;
  success_rate?: number | null;
  average_duration_ms?: number | null;
  p50_duration_ms?: number | null;
  p95_duration_ms?: number | null;
  max_duration_ms?: number | null;
}

export interface RawOverview {
  http?: RawLatencyBlock | null;
  endpoints?: Record<string, RawEndpoint> | null;
  requests?: RawLatencyBlock | null;
  retries?: RawRetries | null;
  sql_execution?: RawSqlExecution | null;
  groups?: Record<string, RawGroup> | null;
  stages?: Record<string, RawStage> | null;
}

/* ------------------------------------ helpers ----------------------------------- */

/** A finite number passes through (0 included); anything else becomes null → "No data". */
function num(value: unknown): Metric {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Milliseconds → seconds, preserving null. */
function msToSec(value: unknown): Metric {
  const n = num(value);
  return n === null ? null : n / 1000;
}

/** Prefer the first block that actually reports a value for the key. */
function pick<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) {
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/**
 * Derived, not fabricated: status is a function of the failure counts the backend
 * already reports. No failures → healthy; some → degraded; majority → unhealthy.
 * With no request data at all we cannot claim health, so we report degraded.
 */
function deriveStatus(total: Metric, failed: Metric): SystemStatus {
  if (failed === null || total === null || total === 0) return failed === 0 ? "healthy" : "degraded";
  if (failed === 0) return "healthy";
  return failed / total > 0.25 ? "unhealthy" : "degraded";
}

/* ------------------------------------ mapping ----------------------------------- */

export function mapOverview(raw: RawOverview, range: TimeRange): ObservabilityOverview {
  const requests = raw.requests ?? raw.http ?? {};
  const http = raw.http ?? {};
  const retries = raw.retries ?? {};
  const sql = raw.sql_execution ?? {};

  const total = pick(num(requests.total_requests), num(http.total_requests));
  const successful = pick(num(requests.successful_requests), num(http.successful_requests));
  const failed = pick(num(requests.failed_requests), num(http.failed_requests));

  const endpoints: EndpointHealth[] = Object.entries(raw.endpoints ?? {})
    .map(([path, e]) => ({
      path,
      requests: num(e?.requests),
      success: num(e?.successful_requests),
      failures: num(e?.failed_requests),
      avg: num(e?.average_latency_seconds),
      p50: num(e?.p50_latency_seconds),
      p95: num(e?.p95_latency_seconds),
      max: num(e?.max_latency_seconds),
      // /query is the primary AI workload; the UI highlights it.
      primary: path === "/query" || path.endsWith("/query"),
    }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || (b.requests ?? 0) - (a.requests ?? 0));

  const stageEntries = Object.entries(raw.stages ?? {});

  const pipeline: PipelineGroup[] = Object.entries(raw.groups ?? {}).map(([name, g]) => {
    const stages: PipelineSubStage[] = stageEntries
      .filter(([, s]) => s?.group === name)
      .map(([stageName, s]) => ({
        name: stageName,
        executions: num(s?.executions),
        avg: msToSec(s?.average_duration_ms),
        p95: msToSec(s?.p95_duration_ms),
        failures: num(s?.failure_count),
      }))
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

    return {
      name,
      executions: num(g?.stage_executions),
      avg: msToSec(g?.average_duration_ms),
      p95: msToSec(g?.p95_duration_ms),
      failures: num(g?.failure_count),
      stages,
    };
  });

  return {
    // The payload carries no server timestamp; this records when the client read it.
    generatedAt: new Date().toISOString(),
    range,
    status: deriveStatus(total, failed),
    requests: {
      total,
      successful,
      failed,
      retried: num(retries.requests_retried),
    },
    latency: {
      p95: pick(num(requests.p95_latency_seconds), num(http.p95_latency_seconds)),
      avg: pick(num(requests.average_latency_seconds), num(http.average_latency_seconds)),
      p50: pick(num(requests.p50_latency_seconds), num(http.p50_latency_seconds)),
    },
    sql: {
      avg: num(sql.average_execution_seconds),
      p95: num(sql.p95_execution_seconds),
      executions: num(sql.total_executions),
    },
    // NOT PROVIDED by the backend. Left empty so the existing empty/"No data" states
    // render instead of showing mock values as if they were real telemetry.
    series: [],
    hotspots: [],
    traces: [],
    endpoints,
    pipeline,
  };
}
