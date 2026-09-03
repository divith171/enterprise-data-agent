/**
 * Adapter: real backend payload → the normalized ObservabilityOverview model.
 * This is the ONLY module that reads raw API field names.
 *
 * Rules enforced here:
 *  - Nothing is fabricated. Unavailable fields become null / [] and the corresponding
 *    `availability` flag goes false so screens render an honest empty state.
 *  - Percentages are always recomputed from raw counts, because the backend's *_rate
 *    fields have an ambiguous unit (0–1 vs 0–100). Counts are unambiguous.
 *  - Pipeline timings arrive in MILLISECONDS (*_duration_ms); request/SQL timings arrive
 *    in SECONDS. Everything in the normalized model is SECONDS.
 */
import { titleize } from "@/lib/format";
import type {
  EndpointHealth,
  ErrorType,
  LatencySummary,
  Metric,
  ObservabilityOverview,
  Percent,
  PipelineGroup,
  Stage,
  SystemStatus,
  TimeRange,
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

/** A finite number passes through (0 included); anything else becomes null. */
function num(value: unknown): Metric {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Milliseconds → seconds, preserving null. */
function msToSec(value: unknown): Metric {
  const n = num(value);
  return n === null ? null : n / 1000;
}

/** Percentage from raw counts, 0–100. Null when the denominator is unknown. */
function pct(numerator: Metric, denominator: Metric): Percent {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

function pick<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) if (v !== null && v !== undefined) return v;
  return null;
}

function latency(block: RawLatencyBlock): LatencySummary {
  return {
    avg: num(block.average_latency_seconds),
    p50: num(block.p50_latency_seconds),
    p95: num(block.p95_latency_seconds),
    max: num(block.max_latency_seconds),
  };
}

/**
 * Derived from the failure counts the backend already reports — not invented.
 * No failures → healthy; some → degraded; more than a quarter → unhealthy.
 */
function deriveStatus(total: Metric, failed: Metric): SystemStatus {
  if (failed === null) return "degraded";
  if (failed === 0) return "healthy";
  if (total === null || total === 0) return "degraded";
  return failed / total > 0.25 ? "unhealthy" : "degraded";
}

/* ------------------------------------ mapping ----------------------------------- */

export function mapOverview(raw: RawOverview, range: TimeRange): ObservabilityOverview {
  const requestsBlock = raw.requests ?? raw.http ?? {};
  const httpBlock = raw.http ?? {};
  const retries = raw.retries ?? {};
  const sql = raw.sql_execution ?? {};

  const total = pick(num(requestsBlock.total_requests), num(httpBlock.total_requests));
  const successful = pick(
    num(requestsBlock.successful_requests),
    num(httpBlock.successful_requests),
  );
  const failed = pick(num(requestsBlock.failed_requests), num(httpBlock.failed_requests));

  /* ---- AI error types (aggregate only; no per-error records in this payload) ---- */
  const rawErrorTypes = requestsBlock.error_types ?? httpBlock.error_types ?? {};
  const errorEntries = Object.entries(rawErrorTypes).filter(
    ([, count]) => typeof count === "number" && Number.isFinite(count),
  ) as [string, number][];
  const errorTotalFromTypes = errorEntries.reduce((a, [, c]) => a + c, 0);
  const errorTotal = errorEntries.length > 0 ? errorTotalFromTypes : failed;
  const errorTypes: ErrorType[] = errorEntries
    .map(([name, count]) => ({
      name,
      count,
      share: pct(count, errorTotal),
    }))
    .sort((a, b) => b.count - a.count);

  /* ------------------------------- endpoints ------------------------------------ */
  const endpoints: EndpointHealth[] = Object.entries(raw.endpoints ?? {})
    .map(([path, e]) => {
      const requests = num(e?.requests);
      const success = num(e?.successful_requests);
      return {
        path,
        requests,
        success,
        failures: num(e?.failed_requests),
        successRate: pct(success, requests),
        avg: num(e?.average_latency_seconds),
        p50: num(e?.p50_latency_seconds),
        p95: num(e?.p95_latency_seconds),
        max: num(e?.max_latency_seconds),
        primary: path === "/query" || path.endsWith("/query"),
      };
    })
    .sort((a, b) => Number(b.primary) - Number(a.primary) || (b.requests ?? 0) - (a.requests ?? 0));

  /* --------------------------- groups + stages ---------------------------------- */
  const rawGroups = raw.groups ?? {};
  const rawStages = raw.stages ?? {};

  const groupLabel = (key: string) => titleize(key);

  const stages: Stage[] = Object.entries(rawStages).map(([key, s]) => {
    const executions = num(s?.executions);
    const successCount = num(s?.success_count);
    const groupKey = typeof s?.group === "string" && s.group.length > 0 ? s.group : "ungrouped";
    return {
      key,
      name: titleize(key),
      group: groupKey,
      groupName: groupLabel(groupKey),
      executions,
      successCount,
      failures: num(s?.failure_count),
      successRate: pct(successCount, executions),
      avg: msToSec(s?.average_duration_ms),
      p50: msToSec(s?.p50_duration_ms),
      p95: msToSec(s?.p95_duration_ms),
      max: msToSec(s?.max_duration_ms),
    };
  });

  const pipeline: PipelineGroup[] = Object.entries(rawGroups).map(([key, g]) => {
    const executions = num(g?.stage_executions);
    const successCount = num(g?.success_count);
    return {
      key,
      name: groupLabel(key),
      executions,
      successCount,
      failures: num(g?.failure_count),
      successRate: pct(successCount, executions),
      avg: msToSec(g?.average_duration_ms),
      p50: msToSec(g?.p50_duration_ms),
      p95: msToSec(g?.p95_duration_ms),
      stages: stages
        .filter((s) => s.group === key)
        .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)),
    };
  });

  // Stages whose group key is missing from `groups` still belong somewhere visible.
  const orphanStages = stages.filter((s) => !(s.group in rawGroups));
  if (orphanStages.length > 0) {
    pipeline.push({
      key: "ungrouped",
      name: "Ungrouped",
      executions: null,
      successCount: null,
      failures: null,
      successRate: null,
      avg: null,
      p50: null,
      p95: null,
      stages: orphanStages.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)),
    });
  }

  /* --------------------------------- SQL ---------------------------------------- */
  const sqlExecutions = num(sql.total_executions);
  const sqlSuccessful = num(sql.successful_executions);
  const sqlEmpty = num(sql.empty_results);

  return {
    // The payload carries no server timestamp; this is when the client read it.
    generatedAt: new Date().toISOString(),
    range,
    status: deriveStatus(total, failed),
    requests: {
      total,
      successful,
      failed,
      retried: num(retries.requests_retried),
      successRate: pct(successful, total),
      failureRate: pct(failed, total),
    },
    latency: latency(requestsBlock),
    httpLatency: latency(httpBlock),
    errors: {
      total: errorTotal,
      rate: pct(errorTotal, total),
      types: errorTypes,
    },
    retries: {
      totalRequests: pick(num(retries.total_requests), total),
      firstAttemptSuccesses: num(retries.first_attempt_successes),
      requestsRetried: num(retries.requests_retried),
      totalRetries: num(retries.total_retries),
      retryRate: pct(num(retries.requests_retried), pick(num(retries.total_requests), total)),
      averageAttempts: num(retries.average_attempts),
      maxAttempts: num(retries.max_attempts),
      failedAfterRetry: failed,
    },
    sql: {
      executions: sqlExecutions,
      successful: sqlSuccessful,
      failed: num(sql.failed_executions),
      successRate: pct(sqlSuccessful, sqlExecutions),
      avg: num(sql.average_execution_seconds),
      p50: num(sql.p50_execution_seconds),
      p95: num(sql.p95_execution_seconds),
      max: num(sql.max_execution_seconds),
      avgRows: num(sql.average_rows_returned),
      p50Rows: num(sql.p50_rows_returned),
      maxRows: num(sql.max_rows_returned),
      emptyResults: sqlEmpty,
      emptyResultRate: pct(sqlEmpty, sqlExecutions),
    },
    endpoints,
    pipeline,
    stages,
    // NOT PROVIDED by this source. Empty, never faked.
    series: [],
    traces: [],
    availability: {
      latencySeries: false,
      requestTraces: false,
      queryLevelSql: false,
      activityLog: false,
      alertRecords: false,
      rangeFiltered: false,
    },
  };
}
