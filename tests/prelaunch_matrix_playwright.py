import json
import os


async def run_prelaunch_matrix(page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))

    results = {"matrix": {}, "tab_orders": {}, "chart_checks": {}, "phase_checks": {}, "responsive_checks": {}}
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

    async def scroll_to_testid(tid: str):
        await page.evaluate(
            """(tid) => {
              const el = document.querySelector(`[data-testid="${tid}"]`);
              if (!el) return false;
              const y = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 120);
              if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
                window.__lenis.scrollTo(y, { immediate: true });
              } else {
                window.scrollTo({top: y, behavior: 'auto'});
              }
              return true;
            }""",
            tid,
        )
        await page.wait_for_timeout(100)

    async def open_details(sel: str):
        is_open = await page.evaluate(
            """(sel) => {
              const d = document.querySelector(sel);
              if (!d) return null;
              return !!d.open;
            }""",
            sel,
        )
        if is_open is False:
            await page.evaluate('''(sel) => { const el=document.querySelector(sel); const y=scrollY+el.getBoundingClientRect().top-120; if(window.__lenis)window.__lenis.scrollTo(y,{immediate:true});else window.scrollTo(0,y); }''',sel)
            await page.click(f"{sel} summary", force=True)
            await page.wait_for_timeout(220)
        assert await page.locator(sel).evaluate('(el)=>el.open'), f"Disclosure did not open: {sel}"

    async def collect_for_question(qid: str):
        return await page.evaluate(
            """(qid) => {
              const doc = document.documentElement;
              const body = document.body;
              const inspector = document.querySelector('[data-testid="trace-inspector"]');
              const pre = document.querySelector('[data-testid="trace-sql-disclosure-code"]');
              const irect = inspector ? inspector.getBoundingClientRect() : null;
              const prect = pre ? pre.getBoundingClientRect() : null;
              const st = pre ? getComputedStyle(pre) : null;

              const beforeX = window.scrollX;
              let moved = null;
              if (pre && pre.scrollWidth > pre.clientWidth) {
                const s0 = pre.scrollLeft;
                pre.scrollLeft = Math.min(40, pre.scrollWidth - pre.clientWidth);
                moved = {before: s0, after: pre.scrollLeft, moved: pre.scrollLeft > s0};
              }

              const original = pre ? pre.textContent : null;
              let token_probe = null;
              if (pre) {
                pre.textContent = original + ' LONGTOKEN_' + 'X'.repeat(1200);
                const p2 = pre.getBoundingClientRect();
                token_probe = {
                  pre_client_width: pre.clientWidth,
                  pre_scroll_width: pre.scrollWidth,
                  containment_by_rect: irect ? p2.right <= irect.right + 0.5 : null,
                  doc_scroll_width: doc.scrollWidth,
                  doc_client_width: doc.clientWidth,
                  has_internal_overflow: pre.scrollWidth > pre.clientWidth
                };
                pre.textContent = original;
              }

              return {
                question: qid,
                viewport_client_width: doc.clientWidth,
                doc_scroll_width: doc.scrollWidth,
                body_width: body.getBoundingClientRect().width,
                body_scroll_width: body.scrollWidth,
                inspector_width: irect ? irect.width : null,
                pre_width: prect ? prect.width : null,
                pre_client_width: pre ? pre.clientWidth : null,
                pre_scroll_width: pre ? pre.scrollWidth : null,
                pre_overflow_x: st ? st.overflowX : null,
                sql_open: pre?.closest('details').open,
                sample_open: document.querySelector('[data-testid="workbench-sample-data"]').open,
                containment_by_rect: (irect && prect) ? (prect.left >= irect.left - 0.5 && prect.right <= irect.right + 0.5) : null,
                page_no_horizontal_overflow: doc.scrollWidth <= doc.clientWidth,
                local_scroll: moved,
                page_scroll_x_after: window.scrollX,
                page_scroll_x_before: beforeX,
                token_probe: token_probe
              };
            }""",
            qid,
        )

    async def collect_chart_state(qid: str):
        return await page.evaluate(
            """(qid) => {
              const map = {
                'question-regional-growth': '[data-testid="chart-signed-bars"]',
                'question-customer-decline': '[data-testid="chart-trend-table"]',
                'question-weekly-change': '[data-testid="chart-paired-bars"]',
                'question-margin-loss': '[data-testid="chart-margin-markers"]'
              };
              const root = document.querySelector('[data-testid="workbench-preview"]').querySelector(map[qid]);
              if (!root) return {present:false};
              const rr = root.getBoundingClientRect();
              return {
                present: true,
                root_width: rr.width,
                root_client_width: root.clientWidth,
                root_scroll_width: root.scrollWidth,
                local_horizontal_scroll: root.scrollWidth > root.clientWidth
              };
            }""",
            qid,
        )

    for vp in viewports:
        print(f"Testing {vp['name']}")
        await page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
        await page.goto(os.environ["REACT_APP_BACKEND_URL"], wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        await page.wait_for_selector('[data-testid="chapter-workbench"]', timeout=20000)
        await scroll_to_testid("chapter-workbench")

        results["matrix"][vp["name"]] = {}
        results["chart_checks"][vp["name"]] = {}
        results["phase_checks"][vp["name"]] = {}

        for qid in question_ids:
            await scroll_to_testid(qid)
            await page.click(f'[data-testid="{qid}"]', force=True)
            await page.wait_for_timeout(420)
            await scroll_to_testid("trace-phase-compute")
            await page.click('[data-testid="trace-phase-compute"]', force=True)
            await page.wait_for_timeout(220)
            await open_details('[data-testid="trace-sql-disclosure"]')
            await open_details('[data-testid="workbench-sample-data"]')

            results["matrix"][vp["name"]][qid] = await collect_for_question(qid)
            if qid == "question-margin-loss" and vp["width"] in [1440, 390]:
                await page.locator('[data-testid="trace-sql-disclosure-code"]').evaluate('(el)=>el.scrollLeft=0')
                await page.evaluate('''() => { const el=document.querySelector('[data-testid="trace-sql-disclosure"]'); window.__lenis.scrollTo(el.getBoundingClientRect().top+scrollY-120,{immediate:true}); }''')
                await page.wait_for_timeout(200)
                await page.screenshot(path=f"inspector-margin-{vp['width']}.jpeg", quality=20, full_page=False)
            phases = {}
            for phase in ["interpret", "ground", "compute", "explain"]:
                await scroll_to_testid(f"trace-phase-{phase}")
                await page.click(f'[data-testid="trace-phase-{phase}"]', force=True)
                await page.wait_for_timeout(300)
                if phase == "interpret":
                    await page.click('[data-testid="trace-metric-button"]', force=True)
                elif phase == "compute":
                    await open_details('[data-testid="trace-sql-disclosure"]')
                    await page.locator('[data-testid^="trace-calc-"]').first.click(force=True)
                elif phase == "explain":
                    await page.locator('[data-testid="trace-evidence"] button').first.click(force=True)
                phases[phase] = await page.evaluate('''() => ({width:innerWidth, document:document.documentElement.scrollWidth, no_overflow:document.documentElement.scrollWidth<=innerWidth})''')
            results["phase_checks"][vp["name"]][qid] = phases
            await scroll_to_testid("trace-phase-interpret")
            await page.click('[data-testid="trace-phase-interpret"]', force=True)
            await page.wait_for_timeout(120)
            results["chart_checks"][vp["name"]][qid] = await collect_chart_state(qid)

        await page.click('[data-testid="trace-phase-interpret"]', force=True)
        await page.focus('[data-testid="trace-phase-interpret"]')
        order = ["trace-phase-interpret"]
        for _ in range(3):
            await page.keyboard.press("Tab")
            await page.wait_for_timeout(80)
            tid = await page.evaluate("""() => document.activeElement?.getAttribute('data-testid') || null""")
            order.append(tid)
        results["tab_orders"][vp["name"]] = order

        await scroll_to_testid("chapter-access")
        await page.click('[data-testid="scenario-mismatch"]', force=True)
        await page.wait_for_timeout(1600)
        results["responsive_checks"][vp["name"]] = await page.evaluate('''() => {
          const scope=document.querySelector('[data-testid="post-hero"]');
          const selectors='button,a,summary';
          const visible=el=>el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!el.closest('[aria-hidden="true"]')&&!el.closest('.ph-sr');
          const controls=[...scope.querySelectorAll(selectors)].filter(visible);
          const small=controls.filter(el=>{const r=el.getBoundingClientRect();return r.height<43.5||r.width<43.5}).map(el=>({text:el.textContent.trim(),testid:el.dataset.testid,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
          const textEscapes=[];
          for(const el of controls){const box=el.getBoundingClientRect(); const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(!n.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.right>box.right+1||r.left<box.left-1)textEscapes.push({control:el.dataset.testid,text:n.textContent.trim()});}}
          return {document:document.documentElement.scrollWidth,viewport:innerWidth,no_overflow:document.documentElement.scrollWidth<=innerWidth,small_controls:small,text_escapes:textEscapes,process_rows:document.querySelectorAll('[data-testid="process-rows"] > div').length,process_sticky:!!document.querySelector('[data-testid="process-sticky-wrapper"]'),access_outcome:document.querySelector('[data-testid="access-outcome"]').textContent,cta_get_started:document.querySelector('[data-testid="cta-get-started"]').getAttribute('href'),cta_sign_in:document.querySelector('[data-testid="cta-sign-in"]').getAttribute('href')};
        }''')

    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")

    print("RESULT_JSON_START")
    print(json.dumps(results))
    print("RESULT_JSON_END")
    return results
