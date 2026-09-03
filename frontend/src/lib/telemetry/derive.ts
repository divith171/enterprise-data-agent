/**
 * Derived views over the normalized telemetry model. Pure functions — no fetching, no
 * fabrication. Everything here is computed from values the backend actually reported.
 */
import type { ObservabilityOverview, PipelineGroup, Stage } from "./types";

export type ConditionSeverity = "healthy" | "info" | "warning" | "critical";

export interface DetectedCondition {
  id: string;
  title: string;
  /** What was measured, in words. */
  detail: string;
  severity: ConditionSeverity;
  /** The metric that triggered it, formatted by the caller. */
  observed: string;
  /** Plain-language threshold this condition uses. */
  rule: string;
}

/** Groups consuming more than their even share of pipeline time. */
export function bottleneckGroups(pipeline: PipelineGroup[]): Set<string> {
  const measured = pipeline.filter((g) => g.avg !== null);
  if (measured.length === 0) return new Set();
  const total = measured.reduce((a, g) => a + (g.avg ?? 0), 0);
  const evenShare = total / measured.length;
  return new Set(measured.filter((g) => (g.avg ?? 0) > evenShare).map((g) => g.key));
}

/** Highest-latency stages, by average duration. Only stages with a measured average. */
export function topStages(stages: Stage[], limit = 8): Stage[] {
  return stages
    .filter((s) => s.avg !== null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
    .slice(0, limit);
}

/** Share of the summed stage budget, 0–1. Additive across stages. */
export function stageShare(stage: Stage, stages: Stage[]): number {
  const total = stages.reduce((a, s) => a + (s.avg ?? 0), 0);
  if (total <= 0) return 0;
  return (stage.avg ?? 0) / total;
}

const pctText = (v: number | null) => (v === null ? "unknown" : `${v.toFixed(2)}%`);

/**
 * Conditions the UI *detects* from live metrics. These are explicitly NOT configured
 * alerts and nothing is dispatched anywhere — the Alerts screen labels them as such.
 */
export function detectedConditions(data: ObservabilityOverview): DetectedCondition[] {
  const out: DetectedCondition[] = [];

  // --- error rate ---
  const failed = data.requests.failed;
  const failureRate = data.requests.failureRate;
  if (failed !== null && failed > 0) {
    out.push({
      id: "error-rate",
      title: "AI requests are failing",
      detail: `${failed} of ${data.requests.total ?? "?"} AI requests failed.`,
      severity: (failureRate ?? 0) > 5 ? "critical" : "warning",
      observed: pctText(failureRate),
      rule: "Any failed AI request",
    });
  }

  // --- retries ---
  const retried = data.retries.requestsRetried;
  if (retried !== null && retried > 0) {
    out.push({
      id: "retry-rate",
      title: "Requests are being retried",
      detail: `${retried} request(s) needed more than one attempt (${data.retries.totalRetries ?? "?"} retries total).`,
      severity: (data.retries.retryRate ?? 0) > 20 ? "warning" : "info",
      observed: pctText(data.retries.retryRate),
      rule: "Retry rate above 0%",
    });
  }

  // --- pipeline bottlenecks ---
  const bottlenecks = bottleneckGroups(data.pipeline);
  for (const group of data.pipeline) {
    if (!bottlenecks.has(group.key)) continue;
    out.push({
      id: `bottleneck-${group.key}`,
      title: `${group.name} dominates pipeline time`,
      detail: `This group averages more than an even share of total pipeline duration.`,
      severity: "info",
      observed: `${(group.avg ?? 0).toFixed(2)}s avg`,
      rule: "Group average above the even share across groups",
    });
  }

  // --- SQL latency ---
  const sqlP95 = data.sql.p95;
  if (sqlP95 !== null && sqlP95 > 2) {
    out.push({
      id: "sql-latency",
      title: "SQL execution P95 is elevated",
      detail: "The slowest 5% of SQL executions exceed two seconds.",
      severity: sqlP95 > 5 ? "warning" : "info",
      observed: `${sqlP95.toFixed(3)}s P95`,
      rule: "SQL P95 above 2s",
    });
  }

  // --- SQL failures ---
  const sqlFailed = data.sql.failed;
  if (sqlFailed !== null && sqlFailed > 0) {
    out.push({
      id: "sql-failures",
      title: "SQL executions are failing",
      detail: `${sqlFailed} SQL execution(s) did not complete successfully.`,
      severity: "critical",
      observed: `${sqlFailed} failed`,
      rule: "Any failed SQL execution",
    });
  }

  // --- empty results ---
  const empty = data.sql.emptyResults;
  if (empty !== null && empty > 0) {
    out.push({
      id: "empty-results",
      title: "Some queries returned no rows",
      detail: `${empty} execution(s) produced an empty result set.`,
      severity: "info",
      observed: pctText(data.sql.emptyResultRate),
      rule: "Any empty result set",
    });
  }

  // --- AI latency ---
  const p95 = data.latency.p95;
  if (p95 !== null && p95 > 30) {
    out.push({
      id: "ai-latency",
      title: "AI request latency is high",
      detail: "P95 end-to-end latency exceeds 30 seconds.",
      severity: p95 > 60 ? "warning" : "info",
      observed: `${p95.toFixed(2)}s P95`,
      rule: "AI request P95 above 30s",
    });
  }

  const order: Record<ConditionSeverity, number> = { critical: 0, warning: 1, info: 2, healthy: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** The monitored rules, shown so an operator knows what IS and ISN'T being watched. */
export const MONITORED_RULES: { label: string; rule: string }[] = [
  { label: "AI request failures", rule: "Any failed AI request" },
  { label: "Retry rate", rule: "Retry rate above 0%" },
  { label: "Pipeline bottleneck", rule: "Group average above even share" },
  { label: "SQL latency", rule: "SQL P95 above 2s" },
  { label: "SQL failures", rule: "Any failed SQL execution" },
  { label: "Empty result sets", rule: "Any empty result set" },
  { label: "AI latency", rule: "AI request P95 above 30s" },
];
