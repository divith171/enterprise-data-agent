import { apiGet } from "@/lib/api";
import { buildMockOverview } from "./mock";
import { mapOverview, type RawOverview } from "./mapper";
import type { ObservabilityOverview, TimeRange } from "./types";

/**
 * Single seam between the UI and the telemetry backend. Components never fetch
 * telemetry directly — they go through useOverview() → fetchOverview().
 *
 * "api"  — the real existing FastAPI service: GET /observability/overview, mapped into
 *          the frontend contract by ./mapper.ts.
 * "mock" — the original in-browser mock provider, kept intact and fully switchable.
 *
 * Switching data sources is this one line:
 */
export type TelemetryMode = "mock" | "api";

export const TELEMETRY_MODE: TelemetryMode = "api";

/** Path on the existing service, reached through the same-origin /api proxy. */
export const OVERVIEW_PATH = "/observability/overview";

const MOCK_LATENCY_MS = 420;

/**
 * Loaders are a lookup rather than an if/else so that flipping TELEMETRY_MODE never
 * leaves a dead literal comparison behind (TS narrows the const and errors on it).
 *
 * The real endpoint is NOT known to accept ?range=, so no range parameter is ever sent:
 * the request is a plain GET /observability/overview.
 */
const LOADERS: Record<TelemetryMode, (range: TimeRange) => Promise<ObservabilityOverview>> = {
  api: async (range) => mapOverview(await apiGet<RawOverview>(OVERVIEW_PATH), range),
  mock: async (range) => {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return buildMockOverview(range);
  },
};

/** Per-mode facts the UI needs so it never overstates what the source did. */
const MODE_FACTS = {
  api: { rangeIsServerFiltered: false, label: "live · /observability/overview" },
  mock: { rangeIsServerFiltered: true, label: "prototype · mock source" },
} satisfies Record<TelemetryMode, { rangeIsServerFiltered: boolean; label: string }>;

/** False in api mode: the range selector is a client control, the source is unfiltered. */
export const RANGE_IS_SERVER_FILTERED: boolean = MODE_FACTS[TELEMETRY_MODE].rangeIsServerFiltered;

export const TELEMETRY_SOURCE_LABEL: string = MODE_FACTS[TELEMETRY_MODE].label;

/** Sections the real payload does not carry today — rendered as empty, never faked. */
export const API_MISSING_SECTIONS = ["series", "traces", "hotspots"] as const;

export function fetchOverview(range: TimeRange): Promise<ObservabilityOverview> {
  return LOADERS[TELEMETRY_MODE](range);
}

export const overviewQueryKey = (range: TimeRange) => ["telemetry", "overview", range] as const;
