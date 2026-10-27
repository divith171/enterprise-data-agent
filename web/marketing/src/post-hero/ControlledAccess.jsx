import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { FIXTURES, SOURCE } from "./demoFixtures";
import { ACCESS_PATH } from "./motionTokens";
import { useMotionPolicy } from "./motionPolicy";
import { useVisiblePlayback } from "./useVisiblePlayback";
import { ChapterHeading } from "./ChapterHeading";

const GATES = [
  { id: "auth", name: "Authenticated access", detail: "The request is associated with an authenticated user.", ok: "Authenticated · sample", bad: "Authenticated · sample", col: 0, row: 0 },
  { id: "rate", name: "Query rate limit", detail: "Query access is subject to application rate limits.", ok: "Within limit · sample", bad: "Within limit · sample", col: 1, row: 0 },
  { id: "ownership", name: "Source ownership", detail: "The selected source must belong to the requesting company.", ok: `${SOURCE.workspace} → ${SOURCE.workspace}`, bad: `${SOURCE.workspace} → ${SOURCE.otherWorkspace} · mismatch`, col: 2, row: 0 },
  { id: "routing", name: "Tenant-aware routing", detail: "The company context determines the source route.", ok: `${SOURCE.workspace} route · sample`, bad: "Not reached", col: 2, row: 1 },
  { id: "validation", name: "SQL validation", detail: "The application validates the generated SQL before execution.", ok: "Validation checkpoint", bad: "Not reached", col: 1, row: 1 },
  { id: "source", name: "Company-owned source", detail: "The source is associated with its owning company.", ok: `${SOURCE.workspace} / ${SOURCE.shortLabel}`, bad: "Not reached", col: 0, row: 1 },
];
const ORDER = ["request", ...GATES.map((g) => g.id)];
const center = (g) => ({ left: `${((g.col * 2 + 1) / 6) * 100}%`, top: g.row === 0 ? "25%" : "75%" });
const DENIED = "Source ownership mismatch · request denied";

const useMedia = (q) => {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const fn = (e) => setM(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [q]);
  return m;
};

export const ControlledAccess = ({ activeExampleId }) => {
  const fixture = FIXTURES[activeExampleId];
  const { effectiveMotion } = useMotionPolicy();
  const wide = useMedia("(min-width: 768px)");
  const [scenario, setScenario] = useState("authorized");
  const [status, setStatus] = useState("idle"); // idle | playing | paused | complete
  const [progress, setProgress] = useState("source"); // last reached id
  const [selectedGate, setSelectedGate] = useState("ownership");
  const [announce, setAnnounce] = useState("");
  const tlRef = useRef(null);
  const markerRef = useRef(null);
  const panelRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const finalFor = (s) => (s === "authorized" ? "source" : "ownership");
  const killTl = () => { tlRef.current?.kill(); tlRef.current = null; };

  const showFinal = useCallback((s) => {
    killTl();
    setProgress(finalFor(s));
    setStatus("idle");
    if (markerRef.current) gsap.set(markerRef.current, { opacity: 0 });
  }, []);

  const play = useCallback((s) => {
    killTl();
    const segs = ACCESS_PATH[s];
    const m = markerRef.current;
    const tl = gsap.timeline({ onComplete: () => setStatus("complete") });
    tl.set(m, { opacity: 1, left: "-3%", top: "25%" }, 0);
    segs.forEach(([id, start, end], i) => {
      tl.call(() => setProgress(id), [], start);
      const gate = GATES.find((g) => g.id === id);
      if (gate) tl.to(m, { ...center(gate), duration: end - start, ease: "power1.inOut" }, start);
      if (i === segs.length - 1) tl.to(m, { opacity: 0, duration: 0.2 }, end);
    });
    tlRef.current = tl;
    setStatus("playing");
  }, []);

  useEffect(() => () => killTl(), []);

  const pause = useCallback((msg) => {
    if (statusRef.current !== "playing") return;
    tlRef.current?.pause();
    setStatus("paused");
    if (msg) setAnnounce(msg);
  }, []);
  useVisiblePlayback(panelRef, () => pause("Path paused."));
  useEffect(() => { if (!effectiveMotion) pause(""); }, [effectiveMotion, pause]);

  const choose = (s) => {
    if (s === scenario) return;
    setScenario(s);
    setProgress("request");
    if (s === "mismatch" && effectiveMotion && wide) play(s); else showFinal(s);
    setAnnounce(s === "mismatch" ? DENIED : "Authorized source · conceptual route completed.");
  };
  const replay = () => { setProgress("request"); play(scenario); };
  const resume = () => { tlRef.current?.play(); setStatus("playing"); };
  const showOutcome = () => { showFinal(scenario); setStatus("complete"); };

  const reachedIdx = ORDER.indexOf(progress);
  const gateState = (g, i) => {
    const idx = i + 1;
    if (scenario === "mismatch") {
      if (g.id === "ownership") return reachedIdx >= idx ? "is-stop" : "";
      if (idx > 3) return "is-unreached";
    }
    return reachedIdx >= idx ? "is-reached" : "";
  };
  const gateLabel = (g, i) => {
    const idx = i + 1;
    if (scenario === "mismatch") {
      if (idx > 3) return "Not reached";
      if (g.id === "ownership") return reachedIdx >= idx ? g.bad : "…";
    }
    return reachedIdx >= idx ? g.ok : "…";
  };
  const selected = GATES.find((g) => g.id === selectedGate);
  const done = status === "idle" || status === "complete";
  const denied = scenario === "mismatch" && reachedIdx >= 3;

  return (
    <section id="security" className="ph-chapter" aria-labelledby="access-heading" data-testid="chapter-access">
      <div className="ph-container">
        <ChapterHeading id="access-heading" title="Built for controlled analytical access." support="Access checks determine which source a request can reach. SQL validation is a separate application-level check." testid="access-heading-block" />
        <div className="ph-access">
          <div>
            <div className="ph-scenarios" role="group" aria-label="Scenario">
              <button type="button" className="ph-scen" aria-pressed={scenario === "authorized"} onClick={() => choose("authorized")} data-testid="scenario-authorized">Authorized source</button>
              <button type="button" className="ph-scen" aria-pressed={scenario === "mismatch"} onClick={() => choose("mismatch")} data-testid="scenario-mismatch">Source ownership mismatch</button>
            </div>
            <p className="ph-support" style={{ marginTop: 0 }}>The order shown is illustrative. Each check is a concept the request passes through before any source is read; it is a diagram, not an audit result.</p>
            <ol className="ph-access__list" data-testid="access-steps-text">
              {GATES.map((g, i) => <li key={g.id}><strong>{g.name}</strong> — {scenario === "mismatch" ? (i + 1 > 3 ? "Not reached" : i + 1 === 3 ? g.bad : g.ok) : g.ok}</li>)}
            </ol>
            <p className="ph-status" role="status" aria-live="polite" data-testid="access-announce">{announce}</p>
          </div>

          <div ref={panelRef} className="ph-panel" data-testid="access-panel">
            <div className="ph-panel__meta">
              <span className="ph-label" data-testid="access-label">Conceptual access path · sample request</span>
              <span className="ph-caption" style={{ margin: 0 }} data-testid="access-context">{SOURCE.workspace} · {fixture.question}</span>
            </div>
            <div className={`ph-route ${wide ? "" : "ph-route--v"}`} data-testid="access-route">
              {wide && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M-3 25 H16.6 M16.6 25 H50 M50 25 H83.3 M83.3 25 V75 M83.3 75 H50 M50 75 H16.6" stroke="#26394D" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                  {scenario === "mismatch" && <path d="M83.3 25 V75 M83.3 75 H50 M50 75 H16.6" stroke="#050A12" strokeWidth="1.5" strokeDasharray="4 4" fill="none" vectorEffect="non-scaling-stroke" opacity="0.9" />}
                </svg>
              )}
              {wide && <span ref={markerRef} className="ph-route-marker" aria-hidden="true" style={{ transform: "translate(-50%, -50%)" }} />}
              {GATES.map((g, i) => (
                <button
                  key={g.id}
                  type="button"
                  className={`ph-gate ${g.id === "source" ? "ph-gate--source" : ""} ${gateState(g, i)}`}
                  style={wide ? { gridColumn: g.col + 1, gridRow: g.row + 1 } : undefined}
                  aria-pressed={selectedGate === g.id}
                  onClick={() => setSelectedGate(g.id)}
                  data-testid={`gate-${g.id}`}
                >
                  {!wide && <span className="ph-gate__num">0{i + 1}</span>}
                  <span className="ph-gate__name">{g.id === "ownership" && denied && <span className="ph-stop" aria-hidden="true">×</span>}{g.name}</span>
                  <span className="ph-gate__state">{gateLabel(g, i)}</span>
                </button>
              ))}
            </div>
            <div className="ph-outcome">
              <p className="ph-outcome__status" data-testid="access-outcome">
                {denied ? DENIED : scenario === "authorized" && reachedIdx === 6 ? `Conceptual route completed · ${SOURCE.workspace} / ${SOURCE.shortLabel}` : "Request in progress · illustration"}
              </p>
              <p className="ph-caption" style={{ margin: 0 }} data-testid="gate-detail"><strong style={{ color: "#F3F7FB", fontWeight: 500 }}>{selected.name}:</strong> {selected.detail}</p>
              <div className="ph-controls" style={{ marginTop: 8 }}>
                {effectiveMotion && wide && done && <button type="button" className="ph-btn" onClick={replay} data-testid="access-replay">Replay path</button>}
                {status === "playing" && <button type="button" className="ph-btn" onClick={() => pause("Path paused.")} data-testid="access-pause">Pause path</button>}
                {status === "paused" && <button type="button" className="ph-btn" onClick={resume} disabled={!effectiveMotion} data-testid="access-resume">Resume path</button>}
                {!done && <button type="button" className="ph-link" onClick={showOutcome} data-testid="access-show-outcome">Show outcome</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
