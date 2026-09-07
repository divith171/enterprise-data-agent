import { apiGet } from "@/lib/api";
import { buildMockOverview } from "./mock";
import { mapOverview, type RawOverview } from "./mapper";
import type { ObservabilityOverview, TimeRange } from "./types";

/**
 * Single seam between the UI and the telemetry backend. Components never fetch
 * telemetry directly — they go through usePageTelemetry() → useOverview() → here.
 *
 * "api"  — the real FastAPI service: GET /observability/overview (reached as
 *          /api/observability/overview through the Vite proxy), normalized by mapper.ts.
 * "mock" — the local mock provider, preserved and switchable. Never a silent fallback.
 *
 * Switching telemetry sources is exactly one line: TELEMETRY_MODE below.
 */
export type TelemetryMode = "mock" | "api";

export const TELEMETRY_MODE: TelemetryMode = "api";

/** Path on the existing service, reached through the same-origin /api proxy. */
export const OVERVIEW_PATH = "/observability/overview";

const MOCK_LATENCY_MS = 420;

/**
 * Loaders are a lookup rather than an if/else so flipping TELEMETRY_MODE never leaves a
 * dead literal comparison behind (TS narrows the const and errors on it).
 *
 * No `?range=` is ever sent: the backend is not verified to support range filtering, so
 * the request is a plain GET /observability/overview.
 */
const LOADERS: Record<TelemetryMode, (range: TimeRange) => Promise<ObservabilityOverview>> = {
  api: async (range) => mapOverview(await apiGet<RawOverview>(OVERVIEW_PATH), range),
  mock: async (range) => {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return buildMockOverview(range);
  },
};

const MODE_FACTS = {
  api: { label: "Live telemetry", detail: "GET /api/observability/overview" },
  mock: { label: "Mock telemetry", detail: "local mock provider" },
} satisfies Record<TelemetryMode, { label: string; detail: string }>;

export const TELEMETRY_SOURCE_LABEL: string = MODE_FACTS[TELEMETRY_MODE].label;
export const TELEMETRY_SOURCE_DETAIL: string = MODE_FACTS[TELEMETRY_MODE].detail;

export function fetchOverview(range: TimeRange): Promise<ObservabilityOverview> {
  return LOADERS[TELEMETRY_MODE](range);
}

export const overviewQueryKey = (range: TimeRange) => ["telemetry", "overview", range] as const;
