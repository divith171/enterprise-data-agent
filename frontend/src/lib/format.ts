import type { Metric } from "@/lib/telemetry/types";

export const NOT_AVAILABLE = "Not available";

/**
 * A metric of 0 is a real measurement and renders as "0". Only null/undefined —
 * genuinely unrecorded — renders as "Not available".
 */
function present(value: Metric | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function fmtSeconds(value: Metric | undefined, digits = 2): string {
  if (!present(value)) return NOT_AVAILABLE;
  return `${value.toFixed(digits)}s`;
}

/** Sub-second durations keep 3 decimals so 0.486s does not collapse to 0.49s. */
export function fmtDuration(value: Metric | undefined): string {
  if (!present(value)) return NOT_AVAILABLE;
  if (value === 0) return "0s";
  if (value < 1) return `${value.toFixed(3)}s`;
  return `${value.toFixed(2)}s`;
}

export function fmtPercent(value: Metric | undefined, digits = 2): string {
  if (!present(value)) return NOT_AVAILABLE;
  return `${value.toFixed(digits)}%`;
}

/** Drops a trailing ".00" so 100% reads as "100%" but 16.67% keeps its precision. */
export function fmtPercentSmart(value: Metric | undefined): string {
  if (!present(value)) return NOT_AVAILABLE;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2)}%`;
}

export function fmtInt(value: Metric | undefined): string {
  if (!present(value)) return NOT_AVAILABLE;
  return Math.round(value).toLocaleString();
}

export function fmtNumber(value: Metric | undefined, digits = 2): string {
  if (!present(value)) return NOT_AVAILABLE;
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(digits);
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
  if (!iso) return NOT_AVAILABLE;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_AVAILABLE;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return NOT_AVAILABLE;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_AVAILABLE;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

/** "business_intent" / "sql-review" / "sqlReview" → "Business Intent". */
export function titleize(raw: string): string {
  const spaced = raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      // Keep well-known acronyms uppercase.
      if (["SQL", "AI", "HTTP", "API", "LLM", "DB", "ID", "P50", "P95"].includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
