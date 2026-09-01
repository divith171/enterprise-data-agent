import { apiGet } from "@/lib/api";
import { buildMockOverview } from "./mock";
import type { ObservabilityOverview, TimeRange } from "./types";

/**
 * Single seam between the UI and the telemetry backend.
 *
 * `mock` — realistic in-browser telemetry (this first version).
 * `api`  — the real control plane. Flip TELEMETRY_MODE to "api" once the existing
 *          data-agent service exposes GET /observability/overview; no component changes.
 */
export type TelemetryMode = "mock" | "api";

export const TELEMETRY_MODE: TelemetryMode = "mock";

/** Path on the existing service. Reached through the same-origin /api proxy. */
export const OVERVIEW_PATH = "/observability/overview";

const MOCK_LATENCY_MS = 420;

export async function fetchOverview(range: TimeRange): Promise<ObservabilityOverview> {
  if (TELEMETRY_MODE === "api") {
    return apiGet<ObservabilityOverview>(`${OVERVIEW_PATH}?range=${range}`);
  }
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return buildMockOverview(range);
}

export const overviewQueryKey = (range: TimeRange) => ["telemetry", "overview", range] as const;
