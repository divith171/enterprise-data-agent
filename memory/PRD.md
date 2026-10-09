# DataKat — Public Marketing Landing Page

## Original Problem Statement (summary)
Build a premium cinematic public landing page for "DataKat" — an AI analytics product positioned as "Your AI Data Analyst". Standalone frontend-only build in this workspace (no backend, no auth, no existing repo to preserve). Two locked supplied assets: the underwater hero artwork and the approved script DataKat wordmark (white script, cat integrated into the D, cyan eyes). Core visual concept: a surface-to-deep-ocean scroll journey — bright sunlit hero descending through marine blue → #0A1428 → #080D18 → #05070D as the visitor goes deeper into the product. 85% premium analytical tech company, 15% DataKat personality. Strict content accuracy: no invented metrics, testimonials, certifications, or capabilities.

## User Personas
- Founder / product lead evaluating AI analytics tools (primary)
- Data-curious business operator who wants answers without SQL/dashboards
- Technical evaluator scanning the pipeline + security sections for credibility

## Architecture
- React 19 + CRA (craco) + Tailwind CSS, standalone frontend (no backend usage)
- react-router-dom routes: `/` (landing), `/login`, `/signup` (honest placeholders), `*` → landing
- framer-motion: entrance animations, scroll reveals, sticky surface→depth transition, pipeline line draw
- lenis: smooth momentum scrolling (skipped under prefers-reduced-motion)
- Assets (processed from user-supplied uploads, in `src/assets/`):
  - `hero-ocean.webp` — the supplied underwater hero artwork (269 KB, converted losslessly-ish from the 2.3 MB PNG for performance; no recoloring)
  - `datakat-wordmark.png` — the approved script wordmark, artifact-streak alpha cleaned and trimmed, transparency preserved
  - `public/favicon.svg` — simple SVG cat mark (ears, cyan eyes, triangular nose) matching the brand's favicon identity
- Typography: Geist (Google Fonts), antialiased

## Core Requirements (static)
Section order: Hero → depth transition → Product demo (#product) → How it works (#how-it-works) → Business questions marquee → More than text-to-SQL pipeline → Security (#security) → Differentiation → Final CTA → minimal footer. Exact demo question/answer/table data from the brief. No pricing, testimonials, logos, FAQ, blog, or fake claims.

## Implemented (2026-07-09)
- Full-bleed cinematic hero: the FINAL user-supplied hero video (`public/media/datakat-hero.mp4`, 1280x720 H.264, 15.6s seamless loop) full-viewport with autoPlay/muted/loop/playsInline, poster extracted from the video's own first frame (`public/media/hero-poster.webp`); cat/action preserved right, copy left (35–40%), localized readability gradients only (left on desktop, bottom on mobile, faint top scrim for navbar), masked line-by-line headline reveal, staggered fade-rise entrance (0.18/0.32/0.44/0.6/0.75s), subtle parallax on scroll
- Media history: first upload was a PNG still (kept unused at `src/assets/hero-ocean.webp`); the mp4 replaced it on 2026-07-09 per user correction. The pod's headless test Chromium lacks the proprietary H.264 codec, so a VP9/WebM fallback (`public/media/datakat-hero.webm`, transcoded from the exact uploaded MP4 — same 1280x720, 24fps, 375 frames, 15.62s, no visual alteration) was added as the FIRST `<source>`, with the original H.264 MP4 second. Verified live in preview: browser picks the WebM, readyState 4, currentTime advances, loop wraps (15.3s → 0.49s), motion visible; production browsers will use the MP4. Autoplay hardened on 2026-07-09: explicit `muted` IDL property + `defaultMuted`, `preload="auto"`, play() retried on `canplay` and on first user interaction (pointerdown/touchstart/scroll/keydown) — covers embedded-iframes or browsers that block the initial autoplay; verified a forced-pause resumes on first click
- Sticky surface→deep-ocean scroll transition (220vh range: sunlight veil + deep-navy layer, text fades before media, media parallax/scale, ends seamlessly into #0A1428)
- Product demo console: question → DataKat answer → exact results table (West $1.24M +21.6% / South $0.98M +7.7% / North $0.81M +2.5% / East $0.76M -7.3%), no charts/exports
- Editorial 4-stage How It Works (Connect/Ask/Analyze/Understand)
- Slow editorial business-questions marquee (6 approved questions, edge fade, pause on hover)
- 8-step analytical pipeline with scroll-drawn connecting line (Understand → … → Explain the result)
- Security section: exactly the 6 grounded concepts, no certifications claimed
- Differentiation typography sequence → "An analyst you can talk to."
- Final CTA (Get Started → /signup, Sign in → /login) + minimal footer (wordmark, 3 anchor links, © 2026 DataKat)
- Navbar: approved wordmark only (no tagline/cat icon/sparkle), transparent → translucent navy on scroll, mobile Menu/X fullscreen #05070D menu
- Accessibility: semantic HTML, focus-visible cyan rings, skip link (off-screen by default via dedicated `.skip-link` CSS, revealed only on `:focus-visible` keyboard focus below the navbar so it never covers the logo; verified 2026-07-09: hidden for mouse/touch, appears on Tab, hides on blur), decorative-media alt handling, prefers-reduced-motion respected
- Verified: all sections screenshotted at 1366/768/375, mobile menu, /login route, production `yarn build` passes

## Backlog / Next Tasks
- P0: Real authentication forms at /login and /signup once the user's backend is connected
- P1: Social share (OG) image derived from the hero artwork
- P1: Additional approved demo questions in the product console (copy must be user-approved)
- P2: Depth-gauge scroll indicator (surface → abyss) as an on-brand accent
- P2: Integration handoff README for the user's real repository
