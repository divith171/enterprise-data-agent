# DataKat — Public Marketing Landing Page

## Original Problem Statement (summary)
Premium cinematic public landing page for "DataKat" (Your AI Data Analyst). Standalone FRONTEND-ONLY workspace: no backend, no auth, `/login` and `/signup` are placeholder routes. Locked assets: 1080p hero video (MP4 + WebM transcode for preview Chromium) and the script wordmark. Surface-to-deep-ocean scroll journey. Strict content accuracy: no invented metrics, certifications, security guarantees or capabilities.

On 2026-07 the post-hero area was rebuilt to the **DataKat Post-Hero Locked Specification v1.0 (12 Oct 2026)** executed via the **Emergent/Fable 5.1 Master Prompt**: exactly five chapters below the frozen hero, one immutable fixture module, GSAP for local timelines + ONE ScrollTrigger, no new Framer Motion/Canvas/WebGL/video below the hero.

## User Personas
- Founder / product lead evaluating AI analytics tools
- Business operator who wants answers without SQL/dashboards
- Technical evaluator inspecting the analytical trace and access-path concepts

## Architecture
- React 19 + CRA (craco) + Tailwind (hero/nav/footer) + scoped plain CSS for post-hero (`src/post-hero/postHero.css`)
- react-router-dom: `/`, `/login`, `/signup` placeholders, `*` → landing
- Hero (LOCKED, byte-identical — hashes in `/app/memory/baseline/hero-hashes-{before,after}.txt`): `components/landing/Hero.jsx`, `Navbar.jsx`, `Reveal.jsx`, `lib/scroll.js`, `public/media/*`, `assets/datakat-wordmark.png`. Framer Motion + Lenis remain only for the hero/page scroll.
- Post-hero (`src/post-hero/`):
  - `PostHeroExperience.jsx` — owns `activeExampleId` + `MotionPolicyProvider`; one `.ph-stack` parent owns the 64/40px inter-chapter gap
  - `demoFixtures.js` — single fixture module (regional-growth, customer-decline, weekly-change, margin-loss); all deltas/growth/contribution/margins derived from rows; snapshot 7 Oct 2026
  - `motionTokens.js` — curves, durations, demo storyboard, process scroll windows, access path timings
  - `motionPolicy.jsx` — OS reduced-motion + user "Page demonstrations · Motion on/off" (OS wins); `useVisiblePlayback.js` — offscreen/hidden-tab suspension, reveal-once, staged swap
  - `productTruthManifest.js` — routes, onboarding flag (false → "Start with DataKat."), conceptual security claims
  - `AnalysisFrame.jsx` (demo 760 / process 520 / fluid workbench variants), `charts.jsx`, `frameStates.jsx` (six demo states + four process artifacts)
  - Chapters: `ProductDemo.jsx` (#product, 16s GSAP timeline), `ProcessStory.jsx` (#how-it-works, sticky ≥1280×800 + rows fallback), `AnalysisWorkbench.jsx` + `QuestionExplorer.jsx` + `AnalysisTrace.jsx` (#workbench), `ControlledAccess.jsx` (#security), `ClosingComposition.jsx` (#closing: Differentiation + FinalCTA)
- `public/index.html` carries a static `<noscript>` equivalent (regional answer/table, four process rows, conceptual access path, differentiation, CTA links)
- Dependency added: `gsap@3.15`. Bundle: JS 132.6 → 192.2 kB gzip (+59.6 kB incl. GSAP core + ScrollTrigger), CSS 11.3 → 15.6 kB (+4.3 kB) — within ≤100 kB budget

## Implemented
- 2026-07-09/10: hero video (1080p MP4 + WebM), hardened autoplay lifecycle, surface→depth exit, skip-link fix (see git history)
- 2026-07 (this session): five locked post-hero chapters
  1. Product proof — default completed answer; `Watch the example` 16s storyboard (states at 0/1.6/4.0/6.2/9.4/11.6s), Pause/Resume/Show answer/Replay, pauses offscreen/hidden-tab/on disclosure; reduced motion → `View example steps`
  2. Process — sticky stage T=N+24, S=min(720, vh−N−48), wrapper 4S, travel 3S, windows .20–.28/.45–.53/.70–.78, dominant switch .24/.49/.74, rail targets .10/.365/.615/.89, `Skip process`, 4.8s idle emphasis on stages 1–3; tablet/mobile/reduced-motion/ineligible → four normal-flow rows
  3. Workbench — 304px question list, `aria-pressed`, 120ms mask + 280/650ms reveals, trace Interpret→Ground→Compute→Explain (2×2 map desktop, numbered list mobile), illustrative SQL disclosures, validation checkpoint (never "Passed")
  4. Controlled access — `Conceptual access path · sample request`, six gates with exact copy, Authorized (2.4s replay) / Source ownership mismatch (1.2s, stops at ownership, later gates `Not reached`), Pause/Resume/Show outcome
  5. Closing — four differentiation lines (0/180/360/760ms), answer receipt from selected example, static question surface, `Start with DataKat.`, Get Started → /signup, Sign in → /login
- Verified: testing agent iteration_1 (~98%, only finding was a "certification" word → rephrased), build passes, hero hashes identical, fixture arithmetic checked, 1440/1280/1366/1024/768/390/360, reduced motion, Motion off, resize mid-stage, 200%-zoom-equivalent

- 2026-07 motion-continuity pass: `DemoCanvas.jsx` (persistent six-state composition in shared overlay cells: phrases → fields descend from strip → labels recede/values align to highlighted schema rows → schema collapses into comparison with header highlight transfer → bars grow and HOLD → table compresses into concepts + checkpoint → concepts recede, `+$220k ÷ +$400k = 55%` resolves, answer settles) and `ProcessCanvas.jsx` (geometry = f(--t1,--t2,--t3,--bar,--hl): schema rows hand slots to interpretation rows; fields lift while period/region headers inherit highlight and change bars extend; non-West/Total rows recede while the derivation + answer rise). Differentiation travel 16px; sticky heading restored to H2 44/48 (stage fits 720/720); workbench/access spacing compressed (page ≈6358px, access ≈620px). Stage-2 idle emphasis intentionally omitted (no real relationship to emphasize). Verified by testing agent iteration_2 (~99%; its "certif" note is stale — string absent from source and bundle).

## Known limitations / product-truth notes
- Security route order is conceptual; onboarding copy uses the locked fallback because no backend exists here
- Two console messages pre-exist in the frozen hero (`defaultMuted` DOM prop, framer-motion useScroll container warning) — intentionally untouched
- Client-only app: JS-disabled fallback is the `<noscript>` block, not a prerender

## Backlog
- P1: Integration handoff README for the real DataKat repository (file inventory + how to mount PostHeroExperience)
- P1: Social share (OG) image from hero artwork
- P2: Real `/login` and `/signup` once a backend exists (out of scope here)
