# Enterprise Data Agent — Observability Control Center

Frontend-only observability UI for an EXISTING natural-language-to-SQL AI agent.
No backend routes were added; the template's `/api/status` skeleton is untouched.

## Stack / layout
- Frontend: Vite + React 19 + Tailwind v4, dark-only (`<html class="dark">`), Geist + JetBrains Mono.
- Routes (`src/App.tsx`): `/` Observability, `/explorer` Pipeline Explorer, `/traces` Request Traces.

## Telemetry source (the one seam)
`src/lib/telemetry/`
- `types.ts` — the telemetry contract (`ObservabilityOverview`, `Metric = number | null`). UNCHANGED.
- `mock.ts` — deterministic-per-range mock telemetry generator. INTACT and still switchable.
- `mapper.ts` — maps the REAL backend payload (`http`, `endpoints`, `requests`, `retries`,
  `sql_execution`, `groups`, `stages`) into `ObservabilityOverview`. Pipeline `*_duration_ms`
  values are converted ms→s; request/SQL values are already seconds.
- `source.ts` — `TELEMETRY_MODE = "api"` (live). Set it to `"mock"` to switch back; the
  loaders are a `Record<TelemetryMode, …>` lookup so either value compiles.
  Calls plain `GET /observability/overview` — **no `?range=` is ever sent** because the
  backend is not verified to support it. `RANGE_IS_SERVER_FILTERED` is false in api mode,
  so screens say "all recorded data · source is not range-filtered".
- `useTelemetry.ts` — `useOverview(range)` TanStack Query hook; the only read path.

### Not provided by the real backend
`series` (historical latency), `traces`, `hotspots` are returned as `[]` — never faked.
The existing empty states render instead. Status is *derived* from the reported failure
counts (0 failures → healthy, some → degraded, >25% → unhealthy).

## Data semantics
`Metric` is `number | null`. `0` renders as `0` / `0.00%` / `0 failures`;
`null` renders as `No data` (see `src/lib/format.ts`). The `/observability/overview`
endpoint row deliberately has `max: null` to exercise that path.

## Key flows
1. Observability: status banner, 5 KPI cards (success, latency P95, error rate, retry rate, SQL exec),
   latency chart (Avg/P50/P95, recharts, hover tooltip), endpoint health table (`/query` highlighted),
   pipeline group bars (expandable sub-stages, bottleneck tags), performance hotspots.
2. Time range 1h/6h/24h/7d regenerates the series (visible chart change). Refresh invalidates the query key.
3. Pipeline Explorer: group bars + flat stage breakdown table sorted by avg latency.
4. Request Traces: filterable trace table → dialog with latency waterfall + generated SQL (mono).

## Auth
None. No accounts, no login.

## MOCKED
Telemetry is LIVE (`TELEMETRY_MODE = "api"`) against `GET /api/observability/overview`.
That route does NOT exist on this pod's template backend, so the preview shows the
"Telemetry unavailable" error state until the real data-agent service is served behind
this origin. Set `TELEMETRY_MODE = "mock"` in `source.ts` to demo with mock telemetry.
