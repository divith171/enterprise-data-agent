// Motion tokens (spec §13) — the single source for curves, durations and scroll windows.
export const EASE = {
  entrance: "cubic-bezier(0.16,1,0.3,1)",
  geometry: "cubic-bezier(0.65,0,0.35,1)",
  response: "cubic-bezier(0.2,0,0,1)",
  idle: "sine.inOut",
};

export const MS = {
  heading: 560,
  headingY: 44,
  headingYMobile: 24,
  support: 320,
  supportDelay: 100,
  label: 200,
  outgoing: 160,
  stateReplace: 280,
  inspector: 240,
  geometry: 600,
  connector: 480,
  chart: 650,
  idleCycle: 4800,
  ctaSettle: 650,
  workbenchMask: 120,
  edgeActivate: 180,
};

// Product demo storyboard (seconds) — state boundaries.
export const DEMO_TIMELINE = [
  { state: 1, at: 0 },
  { state: 2, at: 1.6 },
  { state: 3, at: 4.0 },
  { state: 4, at: 6.2 },
  { state: 5, at: 9.4 },
  { state: 6, at: 11.6 },
];
export const DEMO_DURATION = 16;

// Process scroll contract (normalized p over 3S).
export const PROCESS = {
  windows: [
    [0.2, 0.28],
    [0.45, 0.53],
    [0.7, 0.78],
  ],
  dominantSwitch: [0.24, 0.49, 0.74],
  navTargets: [0.1, 0.365, 0.615, 0.89],
  minWidth: 1280,
  minHeight: 800,
  maxStage: 720,
  topGap: 24,
  bottomGap: 48,
  minFit: 88 + 390 + 56,
};

// Controlled access playback (seconds).
export const ACCESS_PATH = {
  authorized: [
    ["request", 0, 0.3],
    ["auth", 0.3, 0.6],
    ["rate", 0.6, 0.9],
    ["ownership", 0.9, 1.2],
    ["routing", 1.2, 1.5],
    ["validation", 1.5, 1.9],
    ["source", 1.9, 2.4],
  ],
  mismatch: [
    ["request", 0, 0.3],
    ["auth", 0.3, 0.6],
    ["rate", 0.6, 0.9],
    ["ownership", 0.9, 1.2],
  ],
};

// Closing composition offsets (ms).
export const CLOSING = { lines: [0, 180, 360], lineDur: 360, affirmAt: 760, affirmDur: 560, receiptEnd: 1560 };

// Pure-geometry helper: eased progress of p inside [a,b].
const cubicBezier = (p1x, p1y, p2x, p2y) => {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 6; i += 1) {
      const d = sx(t) - x;
      if (Math.abs(d) < 1e-5) break;
      const s = dx(t);
      if (Math.abs(s) < 1e-6) break;
      t -= d / s;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
};
export const easeGeometry = cubicBezier(0.65, 0, 0.35, 1);
export const windowProgress = (p, [a, b]) => Math.min(1, Math.max(0, (p - a) / (b - a)));
