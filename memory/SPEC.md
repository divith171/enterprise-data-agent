# Enterprise Data Agent — Observability Control Center

Production frontend for an EXISTING natural-language-to-SQL AI agent. **No backend code
was written in any session.** `/app/backend/` is the untouched Emergent starter template
and the frontend does not call it.

## Stack
Vite + React 19 + TypeScript strict, Tailwind v4, dark-only (`<html class="dark">`),
Geist (UI) + JetBrains Mono (metrics/SQL/ids), recharts, TanStack Query.

## Routes (src/App.tsx ↔ src/components/layout/nav.ts)
| Route | Page | Purpose |
|---|---|---|
| `/` | Overview | Executive/operational summary |
| `/pipeline` | Pipeline Explorer | Stage-level investigation (sort, filter, select) |
| `/traces` | Request Traces | Not exposed by source → intentional empty state |
| `/sql` | SQL Execution | Aggregate SQL health |
| `/errors` | AI Errors | Error totals + categories |
| `/endpoints` | HTTP Endpoints | Per-route health, sortable |
| `/retries` | Retries & Attempts | Attempt counters |
| `/alerts` | Alerts | Detected conditions (NOT configured alerts) |
`*` falls back to Overview so no URL renders blank.

## Telemetry architecture (the one seam)
`src/lib/telemetry/`
- `types.ts` — normalized model. `Metric = number | null`; percentages are 0–100.
- `mapper.ts` — **the only module that reads raw API field names.** Maps `http`,
  `endpoints`, `requests`, `retries`, `sql_execution`, `groups`, `stages`. Converts
  pipeline `*_duration_ms` → seconds. Recomputes all percentages from raw counts
  (backend `*_rate` units are ambiguous). Sets `availability` flags.
- `mock.ts` — mock provider, preserved and switchable. Never a silent fallback.
- `source.ts` — `TELEMETRY_MODE = "api"` (one line to switch). Calls plain
  `GET /observability/overview` — **no `?range=` is ever sent.**
- `derive.ts` — pure derivations: bottleneck groups, stage ranking/share, detected
  conditions + `MONITORED_RULES`.
- `usePageTelemetry.ts` / `useTelemetry.ts` — the only read path. Components never fetch.

## Honesty rules encoded in the UI
- `0` renders as `0`; `null` renders as **"Not available"** (`src/lib/format.ts`).
- `availability.latencySeries|requestTraces|queryLevelSql|activityLog|alertRecords` are
  all `false` in api mode → `Unavailable` panels explain what IS available instead.
  No "0 buckets", no fabricated chart, no fake traces.
- `availability.rangeFiltered` is false in api mode → the header shows a note that the
  source is not range-filtered.
- Alerts are labelled "detected conditions"; nothing is dispatched.
- Recent operational activity is omitted entirely (no real event data exists).

## Proxy — IMPORTANT
`frontend/vite.config.ts` in this repo still targets `http://localhost:8001` with no
rewrite (the pod default). The user's working local setup proxies `/api/*` →
`127.0.0.1:8000/*` **with an `/api` rewrite**; that edit lives only on their machine and
must be re-applied after cloning. It was deliberately not committed here.

## Verification status
`yarn typecheck`, `yarn build`, `yarn lint` (0 errors) all pass. All 8 routes verified in
a browser against a payload using the real field names and all 15 real stage keys —
0 console errors, 0 failed requests.

## MOCKED
Nothing is mocked in api mode. `GET /api/observability/overview` returns 404 in this pod
(the real service is not running here), so the preview shows the "Telemetry source
unreachable" state. Set `TELEMETRY_MODE = "mock"` in `source.ts` to demo.

## Auth
None.
