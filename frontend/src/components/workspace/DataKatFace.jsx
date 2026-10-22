// Compact DataKat face: near-black head, quiet angular contour, cyan eyes first. One geometry at every size.
const HEAD = "M9.5 21 L12.5 6.5 L20.5 13.6 Q24 12.9 27.5 13.6 L35.5 6.5 L38.5 21 C40 32.5 33.4 40.5 24 40.5 C14.6 40.5 8 32.5 9.5 21 Z";
const EYE_L = "M12.6 23.4 C15 20.6 19.6 20.7 22 24.6 C19 27.3 15 27 12.6 23.4 Z";
const EYE_R = "M35.4 23.4 C33 20.6 28.4 20.7 26 24.6 C29 27.3 33 27 35.4 23.4 Z";

export function DataKatFace({ size = 24, className = "", label }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`dk-face ${className}`} {...a11y}>
      <path d={HEAD} className="dk-face-head" strokeLinejoin="round" />
      <g className="dk-face-eyes">
        <path d={EYE_L} />
        <path d={EYE_R} />
      </g>
      <g className="dk-face-pupils">
        <ellipse cx="17.6" cy="24.1" rx="0.85" ry="2.2" />
        <ellipse cx="30.4" cy="24.1" rx="0.85" ry="2.2" />
      </g>
    </svg>
  );
}

export function AssistantIdentity({ pending, sourceName, testId }) {
  return (
    <div className="dk-identity" data-testid={testId}>
      <DataKatFace size={24} className={pending ? "dk-face-pending" : ""} />
      <span className="dk-identity-name">DataKat</span>
      {sourceName && (
        <span className="dk-identity-source" data-testid={testId && `${testId}-source`}>
          <span className="sr-only">Source: </span>
          {sourceName}
        </span>
      )}
    </div>
  );
}
