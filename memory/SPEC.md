# Enterprise Data Agent — Observability Control Center

Frontend-only observability UI for an EXISTING natural-language-to-SQL AI agent.
No backend routes were added; the template's `/api/status` skeleton is untouched.

## Stack / layout
- Frontend: Vite + React 19 + Tailwind v4, dark-only (`<html class="dark">`), Geist + JetBrains Mono.
- Routes (`src/App.tsx`): `/` Observability, `/explorer` Pipeline Explorer, `/traces` Request Traces.

## Telemetry source (the one seam)
`src/lib/telemetry/`
- `types.ts` — the telemetry contract (`ObservabilityOverview`, `Metric = number | null`).
- `mock.ts` — deterministic-per-range mock telemetry generator.
- `source.ts` — `TELEMETRY_MODE` (`"mock"` today). Flip to `"api"` to call
  `GET /observability/overview?range=…` through the same-origin `/api` proxy. No component changes.
- `useTelemetry.ts` — `useOverview(range)` TanStack Query hook; the only read path.

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
All telemetry is MOCKED in the frontend. No live metrics.
