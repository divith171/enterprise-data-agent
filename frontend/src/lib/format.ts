import type { Metric } from "@/lib/telemetry/types";

export const NO_DATA = "No data";

/**
 * A metric of 0 is a real measurement and renders as "0". Only null/undefined —
 * genuinely unrecorded — renders as "No data".
 */
function present(value: Metric | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function fmtSeconds(value: Metric | undefined, digits = 2): string {
  if (!present(value)) return NO_DATA;
  return `${value.toFixed(digits)}s`;
}

/** Sub-second durations keep 3 decimals so 0.486s does not collapse to 0.49s. */
export function fmtDuration(value: Metric | undefined): string {
  if (!present(value)) return NO_DATA;
  return value < 1 ? fmtSeconds(value, 3) : fmtSeconds(value, 2);
}

export function fmtPercent(value: Metric | undefined, digits = 2): string {
  if (!present(value)) return NO_DATA;
  return `${value.toFixed(digits)}%`;
}

export function fmtInt(value: Metric | undefined): string {
  if (!present(value)) return NO_DATA;
  return value.toLocaleString();
}

export function fmtMillis(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function ratio(numerator: Metric, denominator: Metric): Metric {
  if (!present(numerator) || !present(denominator) || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function fmtClock(iso: string | undefined): string {
  if (!iso) return NO_DATA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NO_DATA;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return NO_DATA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NO_DATA;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
