import json


async def run_before_matrix(page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))

    results = {"matrix": {}, "keyboard_order": {}, "playback_probe": {}}
    question_ids = [
        "question-regional-growth",
        "question-customer-decline",
        "question-weekly-change",
        "question-margin-loss",
    ]
    viewports = [
        {"name": "desktop_1440x900", "width": 1440, "height": 900},
        {"name": "desktop_1366x768", "width": 1366, "height": 768},
        {"name": "desktop_1024x768", "width": 1024, "height": 768},
        {"name": "tablet_768x1024", "width": 768, "height": 1024},
        {"name": "mobile_390x844", "width": 390, "height": 844},
        {"name": "mobile_360x800", "width": 360, "height": 800},
    ]

    async def scroll_to_testid(testid: str):
        await page.evaluate(
            """(tid) => {
                const el = document.querySelector(`[data-testid="${tid}"]`);
                if (!el) return false;
                const y = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 24);
                if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
                    window.__lenis.scrollTo(y, { immediate: true });
                } else {
                    window.scrollTo({ top: y, behavior: 'auto' });
                }
                return true;
            }""",
            testid,
        )

    async def collect_metrics():
        return await page.evaluate(
            """() => {
                const doc = document.documentElement;
                const body = document.body;
                const inspector = document.querySelector('[data-testid="trace-inspector"]');
                const pre = inspector ? inspector.querySelector('.ph-sql') : null;
                const inspectorRect = inspector ? inspector.getBoundingClientRect() : null;
                const preRect = pre ? pre.getBoundingClientRect() : null;
                const st = pre ? getComputedStyle(pre) : null;
                return {
                    doc_scroll_width: doc?.scrollWidth,
                    doc_client_width: doc?.clientWidth,
                    body_scroll_width: body?.scrollWidth,
                    inspector_width: inspectorRect?.width,
                    pre_width: preRect?.width,
                    pre_client_width: pre?.clientWidth,
                    pre_scroll_width: pre?.scrollWidth,
                    pre_overflow_x: st?.overflowX,
                    containment_fails: !!(inspector && pre && (preRect.width > inspectorRect.width || pre.scrollWidth > pre.clientWidth))
                }
            }"""
        )

    try:
        for vp in viewports:
            await page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            await page.goto("https://datakat-analyst.preview.emergentagent.com", wait_until="domcontentloaded")
            await page.wait_for_timeout(1000)
            await page.wait_for_selector('[data-testid="chapter-workbench"]', timeout=15000)
            await scroll_to_testid("chapter-workbench")
            await page.wait_for_timeout(300)

            results["matrix"][vp["name"]] = {}
            for qid in question_ids:
                await page.click(f'[data-testid="{qid}"]', force=True)
                await page.wait_for_timeout(500)
                await page.click('[data-testid="trace-phase-compute"]', force=True)
                await page.wait_for_timeout(250)
                await page.click('[data-testid="trace-sql-disclosure"] summary', force=True)
                await page.wait_for_timeout(250)
                results["matrix"][vp["name"]][qid] = await collect_metrics()

        print(json.dumps(results))
        return results
    except Exception as exc:
        print(f"before matrix failed: {exc}")
        raise
