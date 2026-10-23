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

## Redesign (2026-06, iteration 2)
- Deep blue + black visual system with Geist (`@fontsource-variable/geist`). Styles live in `src/styles/datakat.css`, which replaces `App.css`.
- Line-art cat motif (`CatMotif.jsx`): 96px on the welcome screen with a 500ms line reveal, 22px in the identity row, and an illumination cycle on pending responses that runs 2.8s at most 3 times.
- SQL is removed from the customer UI. `SqlDisclosure` is deleted, and the parser drops the `sql` field before it reaches UI state.
- The answer surface comes first, followed by a separate evidence section. The composer is compact (66px) with an icon Send button. The empty state is one centered composition and uses the same composer element.
- Preview fixtures sit behind a discreet indicator and a "Preview tools" sheet. The yellow banner and the cropped logo mark are removed. The original white logo is used, since the surfaces are now dark.
- Testing-agent iteration 2: all regression checks passed. Afterwards fixed: placeholder wrapping at 320px, the misleading follow-up hint when no source is available, and row height (uuid and date cells no longer wrap).

## Redesign v3 (2026-06, iteration 3), based on Dribbble 27242124 (inspected directly)
- Composition: near-black chrome (rail and header #080D17) wraps one inset conversation plane (#0B1424, 20px radius). Each response is a raised grouping (#101D33, 18px radius): identity row, then the answer, then a darker evidence panel (#0D192B). The composer sits inside the bottom of the plane.
- New compact face `DataKatFace.jsx`: near-black head, quiet contour, cyan eyes with slit pupils. It appears at 36px in the rail, 72px (64px on mobile) in the welcome, and 24px in identity rows and pending. Pending makes the eyes glow at most 3 cycles of 2.8s. The welcome reveal takes 300ms.
- The seated line-art cat (`CatMotif.jsx`) is removed everywhere, and the login page shows the wordmark only.
- Unchanged: API, state, auth, session, parser, fixtures and the 429 countdown.
- Testing-agent iteration 3: 100% of the requested checks passed. The production build passes, and the bundle contains no fixtures and no SQL strings.

## Redesign v4: ChatFrame-inspired (2026-06, iteration 4)
- Reference: the ChatFrame "AI Assistance" gallery image, inspected directly.
- Near-black palette: canvas #03060C, chrome #070B12, plane #0B111B. Softened text #D1DCEC / #899BB5. Focus colour #86B8FF. Faint neutral edges in place of blue outlines.
- Nested composer: a gradient outer shell (28px radius, 6px padding) around a darker inset (22px). The circular Send button rests dark and turns blue when enabled. Soft decorative blue light sits behind the composer only and doesn't affect layout. Height stays content-driven: 72px at rest, textarea capped at about 208px.
- All generated cat/face artwork removed (`DataKatFace.jsx` deleted). The identity row is now text only (`AssistantIdentity.jsx`). The welcome screen uses a text eyebrow line. The approved wordmark is kept.
- Login brand group is centred; fields remain left-aligned.
- Testing-agent iteration 4: 100% of the requested checks passed. The production build passes, with no fixtures, SQL or console calls in the bundle.
- Known pre-existing behaviour, left unchanged: the composer label stays "Clarification" while a follow-up is pending after a clarification.

## Known integration items
- The `/data-sources` response shape is assumed to be a top-level array, and `type` is assumed to be "postgresql"/"postgres".
- No documented "analysis cannot continue" response exists, so none is implemented.
- `public/index.html` still loads the Emergent platform preview script. Review it before production.

## Backlog
- P1: retest at 200% text zoom and 400% browser zoom on real devices; check the iOS keyboard.
- P2: Export (CSV/Excel) once the backend supports it.

## 2026-06 Final targeted correction pass (D1, D2, N1, N3)
- D1: composer label derives from the newest turn (pending follow-up shows "Follow-up") — useWorkspace.js
- D2: workspace unmount clears the live region (no stale "Question sent." after 401) — useWorkspace.js
- N1: tablet (768–1023px) composer glow bottom -52px; no page overflow — datakat.css
- N3: rail items 60px (active bar left -2px); placeholder "Ask about your data…" at ≤369px — datakat.css, QuestionComposer.jsx
- Verified: iteration_5 + follow-up screenshot check; production build passes
