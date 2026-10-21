# DataKat Customer Workspace — PRD

## Original problem statement
Build the authenticated customer-facing DataKat analytical workspace ("Your AI Data Analyst"). It is frontend only, with routes /login and /app. It is a source-bound analytical workspace with conversational result cards, and must not be a ChatGPT clone. Full master spec was supplied by the user and is the source of truth. Scope clarification from the user: build a standalone customer frontend only. Do not touch the marketing site or the real backend. Use clearly labeled dev-only fixtures. Use the uploaded DataKat logo as the brand source, adapted only as much as needed for light surfaces.

## Architecture (frontend only)
- `src/api/` – `liveApi` uses credentialed fetch, sends the CSRF header on logout and has no token storage. `index.js` swaps in the preview API only when `NODE_ENV !== production && REACT_APP_DATAKAT_PREVIEW=true`.
- `src/preview/` – development fixtures (one canonical success fixture plus separate state fixtures) and the Preview controls sheet.
- `src/lib/queryContract.js` – validates schema v1 and the outcome discriminator. Unknown or malformed responses show a safe compatibility card.
- `src/lib/safeMarkdown.jsx` – a custom strict-subset renderer. It renders no HTML, images or links.
- `src/auth/` – AuthProvider (verify with /auth/me, authLost with same-identity draft restore, signOut) and RequireAuth gate.
- `src/workspace/` – `useWorkspace` (session ID, turns, draft, one in-flight request, scroll, inactivity notice, rate limit) and `useDataSource` (source selection and 403 revalidation).
- `src/components/` – shell, rail, header, cards, table, pager, SQL disclosure, dialogs, composer, status region.
- Brand assets: `public/brand/datakat-logo.png` and `public/brand/datakat-mark.png`. These are the user's artwork; the white strokes were recolored to #102C4C for light surfaces and the cyan eyes were kept.

## Integration placeholders (frontend/.env)
- `REACT_APP_DATAKAT_API_BASE` – empty means same-origin.
- `REACT_APP_DATAKAT_MARKETING_URL` – placeholder `/`.
- `REACT_APP_DATAKAT_PREVIEW=true` – development fixtures. Set it to false (or build for production) to use the live API.

## Implemented (2026-06)
- Login, auth gate, logout, all /query outcomes and HTTP states, table rendering rules, paging, SQL disclosure, Export reservation, clarification flow, new analysis, inactivity notice, responsive layout and accessibility.
- Tested in testing-agent iteration 1 (~95%). Afterwards fixed: sr-only overflow, caret placed at end after fill, dialog description and numeric wrapping.

## Known integration items
- The `/data-sources` response shape is assumed to be a top-level array, and `type` is assumed to be "postgresql"/"postgres".
- No documented "analysis cannot continue" response exists, so none is implemented.
- `public/index.html` still loads the Emergent platform preview script. Review it before production.

## Backlog
- P1: retest at 200% text zoom and 400% browser zoom on real devices; check the iOS keyboard.
- P2: Export (CSV/Excel) once the backend supports it.
