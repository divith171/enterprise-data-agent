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
| `/llm` | LLM Usage & Cost | Provider / model / layer token + cost attribution |
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

### LLM usage & cost
`llm` is mapped from the backend's `llm` object into `LlmSummary` (types.ts):
totals, token counts, `estimatedCost`, `latency` (reuses `LatencySummary`), and three
`LlmBreakdown[]` arrays (`byProvider`, `byModel`, `byLayer`). Each row carries the 7 raw
fields plus four mapper-derived engineering figures — `costShare`, `costPerCall`,
`costPer1kTokens`, `tokensPerCall` — sorted most-expensive first. Model names render
verbatim (identifiers engineers recognise); providers use canonical casing
(`PROVIDER_LABELS`); layers are titleized. `llm` is `null` and `availability.llmUsage`
is `false` when the payload omits the object → honest empty state, never zeros.
Cost is framed as an engineering estimate, explicitly not billing.

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
`frontend/vite.config.ts` proxies `/api` → **`http://127.0.0.1:8000`** with
`rewrite: (path) => path.replace(/^\/api/, "")`. The rewrite is load-bearing: the
frontend calls `/api/observability/overview` while FastAPI exposes
`/observability/overview` without the prefix. Verified functionally by curling
`localhost:3000/api/observability/overview` against a temporary echo listener, which
received `/observability/overview`.

NOTE: the public preview URL does **not** exercise this proxy — the platform ingress
sends `/api` straight to port 8001, bypassing the Vite dev server. Only
`http://localhost:3000` goes through the config above. No backend runs on :8000 in this
pod, so the preview shows the "Telemetry source unreachable" state; that is expected.

## Disclosure UI
Source limitations are disclosed without repetition: the sidebar carries a persistent
live/offline source badge, the header carries a LIVE/DISCONNECTED pill, Overview shows
the full "not range-filtered" banner once (`prominentDisclosure`), and every other page
shows a compact `range-not-filtered-chip` ("Aggregate") whose `title` holds the identical
sentence. Per-capability `Unavailable` panels remain on their own pages.

## Wording
Pipeline groups above the even share are labelled **HIGH SHARE** (not "BOTTLENECK"), with
a tooltip stating it reflects share of duration, not a critical-path or causal analysis.
`PIPELINE_SHARE_RULE` in derive.ts is the single source for that rule string so a detected
condition matches its monitored rule exactly.

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
