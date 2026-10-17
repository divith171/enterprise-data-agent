import json
import time
import os


async def run_prelaunch_additional(page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))

    out = {
        "product_demo": {},
        "controlled_access": {},
        "process_layout": {},
        "reduced_motion": {},
        "controls": {},
    }

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
        state = await page.evaluate(
            """(sel) => {
              const d = document.querySelector(sel);
              if (!d) return null;
              return !!d.open;
            }""",
            sel,
        )
        if state is False:
            await page.evaluate('''(sel) => { const el=document.querySelector(sel);const y=scrollY+el.getBoundingClientRect().top-120;if(window.__lenis)window.__lenis.scrollTo(y,{immediate:true});else window.scrollTo(0,y); }''',sel)
            await page.click(f"{sel} summary", force=True)
            await page.wait_for_timeout(250)
        assert await page.locator(sel).evaluate('(el)=>el.open'),f"Disclosure did not open: {sel}"

    print("STEP: Product demo playback")
    await page.set_viewport_size({"width": 1440, "height": 900})
    await page.goto(os.environ["REACT_APP_BACKEND_URL"], wait_until="domcontentloaded")
    await page.wait_for_timeout(1200)
    await scroll_to_testid("chapter-product")

    motion_text = await page.text_content('[data-testid="motion-toggle-product-button"]')
    if motion_text and "Motion off" in motion_text:
        await page.click('[data-testid="motion-toggle-product-button"]', force=True)
        await page.wait_for_timeout(250)

    await page.click('[data-testid="demo-watch-button"]', force=True)
    t0 = time.time()
    samples = []
    for _ in range(24):
        await page.wait_for_timeout(250)
        state = await page.evaluate(
            """() => {
              const root = document.querySelector('[data-testid^="demo-state-"]');
              const active = root?.getAttribute('data-testid') || null;
              const src = document.querySelector('[data-testid="demo-phrase-dimension"]');
              const tgt = document.querySelector('[data-testid="demo-field-dimension"] dd');
              const src2 = document.querySelector('[data-testid="demo-phrase-metric"]');
              const tgt2 = document.querySelector('[data-testid="demo-field-metric"] dd');
              const src3 = document.querySelector('[data-testid="demo-phrase-time"]');
              const tgt3 = document.querySelector('[data-testid="demo-field-time"] dd');
              const c = (n) => n ? getComputedStyle(n).color : null;
              return {
                active,
                src_dim: c(src),
                tgt_dim: c(tgt),
                src_metric: c(src2),
                tgt_metric: c(tgt2),
                src_time: c(src3),
                tgt_time: c(tgt3),
              };
            }"""
        )
        samples.append({"t": round(time.time() - t0, 2), **state})

    await page.wait_for_timeout(4200)
    await open_details('[data-testid="sql-disclosure"]')
    await page.wait_for_timeout(220)
    pause_text = await page.text_content('[data-testid="demo-status"]')
    val_probe = await page.evaluate(
        """() => {
          const icon = document.querySelector('[data-testid="validation-checkpoint-icon"]');
          const lbl = document.querySelector('[data-testid="validation-checkpoint-label"]');
          if (!icon || !lbl) return {present:false};
          const ci = getComputedStyle(icon);
          const after = getComputedStyle(icon, '::after');
          return {
            present: true,
            label: lbl.textContent.trim(),
            icon_color: ci.color,
            icon_border_color: ci.borderColor,
            after_bg: after.backgroundColor,
            has_checkmark: lbl.textContent.includes('✓')
          };
        }"""
    )

    demo_disclosures = {}
    for w, h in [(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(360,800)]:
        await page.set_viewport_size({"width":w,"height":h})
        await page.wait_for_timeout(350)
        await scroll_to_testid("sql-disclosure")
        demo_disclosures[f"{w}x{h}"] = await page.evaluate('''() => {const pre=document.querySelector('[data-testid="sql-disclosure-code"]');const col=pre.closest('.dc-col').getBoundingClientRect();const r=pre.getBoundingClientRect();return {viewport:innerWidth,document:document.documentElement.scrollWidth,no_overflow:document.documentElement.scrollWidth<=innerWidth,code_width:r.width,column_width:col.width,code_contained:r.left>=col.left-1&&r.right<=col.right+1,open:pre.closest('details').open,neutral_icon_visible:document.querySelector('[data-testid="validation-checkpoint-icon"]').checkVisibility({checkVisibilityCSS:true,checkOpacity:true})};}''')
        if w==1440:
            await page.evaluate('''() => {const el=document.querySelector('[data-testid="validation-checkpoint"]');window.__lenis.scrollTo(el.getBoundingClientRect().top+scrollY-140,{immediate:true})}''')
            await page.screenshot(path='validation-neutral-1440.jpeg',quality=20,full_page=False)
    await scroll_to_testid("demo-show-answer-button")
    show_btn = await page.query_selector('[data-testid="demo-show-answer-button"]')
    if show_btn:
        await page.click('[data-testid="demo-show-answer-button"]', force=True)
        await page.wait_for_timeout(800)
    await open_details('[data-testid="view-sample-data"]')
    demo_samples = {}
    for w,h in [(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(360,800)]:
        await page.set_viewport_size({"width":w,"height":h})
        await page.wait_for_timeout(300)
        demo_samples[f"{w}x{h}"] = await page.evaluate('''() => ({viewport:innerWidth,document:document.documentElement.scrollWidth,no_overflow:document.documentElement.scrollWidth<=innerWidth,open:document.querySelector('[data-testid="view-sample-data"]').open})''')
    await page.set_viewport_size({"width":1440,"height":900})
    out["product_demo"] = {
        "timeline_samples": samples,
        "pause_text_after_sql_open": pause_text,
        "validation_checkpoint": val_probe,
        "sql_viewports": demo_disclosures,
        "sample_viewports": demo_samples,
    }

    print("STEP: Controlled access")
    await scroll_to_testid("chapter-access")
    await page.click('[data-testid="scenario-authorized"]', force=True)
    await page.wait_for_timeout(300)
    auth_text = await page.text_content('[data-testid="access-outcome"]')

    await page.click('[data-testid="scenario-mismatch"]', force=True)
    await page.wait_for_timeout(1500)
    mismatch_text = await page.text_content('[data-testid="access-outcome"]')
    gate_states = await page.evaluate(
        """() => {
          const ids = ['auth','rate','ownership','routing','validation','source'];
          const x = {};
          ids.forEach(id => {
            const el = document.querySelector(`[data-testid="gate-${id}"]`);
            x[id] = {
              className: el?.className || null,
              state: el?.querySelector('.ph-gate__state')?.textContent?.trim() || null
            };
          });
          return x;
        }"""
    )
    out["controlled_access"] = {
        "authorized": auth_text,
        "mismatch": mismatch_text,
        "gates": gate_states,
    }

    print("STEP: Process layout per viewport")
    proc = {}
    for vp in [(1440, 900), (1366, 768), (1024, 768), (768, 1024), (390, 844), (360, 800)]:
        await page.set_viewport_size({"width": vp[0], "height": vp[1]})
        await page.goto(os.environ["REACT_APP_BACKEND_URL"], wait_until="domcontentloaded")
        await page.wait_for_timeout(1100)
        await scroll_to_testid("chapter-process")
        proc[f"{vp[0]}x{vp[1]}"] = await page.evaluate(
            """() => ({
              sticky_present: !!document.querySelector('[data-testid="process-sticky-wrapper"]'),
              rows_present: !!document.querySelector('[data-testid="process-rows"]')
            })"""
        )
    out["process_layout"] = proc

    print("STEP: Reduced motion")
    await page.emulate_media(reduced_motion="reduce")
    await page.set_viewport_size({"width": 1440, "height": 900})
    await page.goto(os.environ["REACT_APP_BACKEND_URL"], wait_until="domcontentloaded")
    await page.wait_for_timeout(1100)
    await scroll_to_testid("chapter-product")
    reduced_desktop = await page.evaluate(
        """() => {
          const anim = Array.from(document.querySelectorAll('.ph *')).filter(el => {
            const a = getComputedStyle(el).animationName;
            return a && a !== 'none';
          }).length;
          return {
            motion_toggle_disabled: !!document.querySelector('[data-testid="motion-toggle-product-button"]')?.disabled,
            has_view_steps: !!document.querySelector('[data-testid="view-example-steps"]'),
            process_rows_present: !!document.querySelector('[data-testid="process-rows"]'),
            active_animation_count: anim,
          };
        }"""
    )
    await scroll_to_testid("chapter-workbench")
    await page.click('[data-testid="question-regional-growth"]', force=True)
    await page.wait_for_timeout(200)
    await page.click('[data-testid="trace-phase-compute"]', force=True)
    await page.wait_for_timeout(200)
    await open_details('[data-testid="trace-sql-disclosure"]')
    sql_visible = await page.is_visible('[data-testid="trace-sql-disclosure-code"]')

    await page.set_viewport_size({"width": 390, "height": 844})
    await page.goto(os.environ["REACT_APP_BACKEND_URL"], wait_until="domcontentloaded")
    await page.wait_for_timeout(1000)
    await scroll_to_testid("chapter-product")
    reduced_mobile = await page.evaluate(
        """() => ({
          has_view_steps: !!document.querySelector('[data-testid="view-example-steps"]'),
          process_rows_present: !!document.querySelector('[data-testid="process-rows"]')
        })"""
    )

    reduced_viewports = {}
    for w,h in [(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(360,800)]:
        await page.set_viewport_size({"width":w,"height":h})
        await page.goto(os.environ["REACT_APP_BACKEND_URL"],wait_until="domcontentloaded")
        await page.wait_for_timeout(700)
        await scroll_to_testid("question-margin-loss")
        await page.click('[data-testid="question-margin-loss"]',force=True)
        await scroll_to_testid("trace-phase-compute")
        await page.click('[data-testid="trace-phase-compute"]',force=True)
        await open_details('[data-testid="trace-sql-disclosure"]')
        reduced_viewports[f"{w}x{h}"] = await page.evaluate('''() => ({viewport:innerWidth,document:document.documentElement.scrollWidth,no_overflow:document.documentElement.scrollWidth<=innerWidth,toggle_disabled:document.querySelector('[data-testid="motion-toggle-product-button"]').disabled,view_steps:!!document.querySelector('[data-testid="view-example-steps"]'),demo_state:document.querySelector('[data-testid^="demo-state-"]').dataset.testid,process_rows:document.querySelector('[data-testid="process-rows"]').children.length,sql_open:document.querySelector('[data-testid="trace-sql-disclosure"]').open,animations:[...document.querySelectorAll('.ph *')].filter(el=>getComputedStyle(el).animationName!=='none').length,transitions:[...document.querySelectorAll('.ph *')].filter(el=>getComputedStyle(el).transitionDuration!=='0s').length})''')
    await page.emulate_media(reduced_motion="no-preference")
    await page.set_viewport_size({"width": 1440, "height": 900})
    await page.goto(os.environ["REACT_APP_BACKEND_URL"], wait_until="domcontentloaded")
    await page.wait_for_timeout(1100)
    await scroll_to_testid("chapter-product")
    await page.click('[data-testid="demo-watch-button"]', force=True)
    await page.wait_for_timeout(1800)
    await page.click('[data-testid="motion-toggle-product-button"]', force=True)
    await page.wait_for_timeout(300)
    mid_toggle = await page.evaluate(
        """() => ({
          toggle_text: document.querySelector('[data-testid="motion-toggle-product-button"]')?.textContent?.trim() || null,
          status_text: document.querySelector('[data-testid="demo-status"]')?.textContent?.trim() || null,
          has_view_steps: !!document.querySelector('[data-testid="view-example-steps"]')
        })"""
    )

    out["reduced_motion"] = {
        "desktop": reduced_desktop,
        "mobile": reduced_mobile,
        "sql_still_works": sql_visible,
        "mid_toggle": mid_toggle,
        "viewports": reduced_viewports,
    }

    print("STEP: Controls")
    await scroll_to_testid("chapter-closing")
    out["controls"] = await page.evaluate(
        """() => {
          const sels = [
            '[data-testid="question-regional-growth"]',
            '[data-testid="trace-phase-interpret"]',
            '[data-testid="trace-phase-ground"]',
            '[data-testid="trace-phase-compute"]',
            '[data-testid="trace-phase-explain"]',
            '[data-testid="scenario-authorized"]',
            '[data-testid="scenario-mismatch"]',
            '[data-testid="cta-get-started"]',
            '[data-testid="cta-sign-in"]'
          ];
          const sizes = sels.map(sel => {
            const el = document.querySelector(sel);
            if (!el) return {sel, present:false};
            const r = el.getBoundingClientRect();
            return {sel, present:true, width:r.width, height:r.height, meets_44px: r.width >= 44 && r.height >= 44};
          });
          return {
            cta_get_started: document.querySelector('[data-testid="cta-get-started"]')?.getAttribute('href') || null,
            cta_sign_in: document.querySelector('[data-testid="cta-sign-in"]')?.getAttribute('href') || null,
            sizes,
          };
        }"""
    )

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
    print(json.dumps(out))
    print("RESULT_JSON_END")
    return out
