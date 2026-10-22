import { useId } from "react";

const HEAD = [
  "M30 37 L33 15 L44 27 H52 L63 15 L66 37",
  "M66 37 C66 47 58 53 48 53 C38 53 30 47 30 37",
  "M41 39 H45 M51 39 H55",
];
const FULL = [...HEAD, "M37 51 C29 59 27 72 31 84 H65 C69 72 67 59 59 51", "M65 84 C77 85 84 77 80 66"];

// Interface motif only (not the DataKat logo): a minimal seated line-art cat.
export function CatMotif({ size = 96, variant = "full", className = "" }) {
  const gid = `dkcat${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const head = variant === "head";
  return (
    <svg
      width={size}
      height={size}
      viewBox={head ? "26 11 44 46" : "0 0 96 96"}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`dk-cat ${className}`}
    >
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="28" y1="12" x2="82" y2="86">
          <stop offset="0" stopColor="#6FE7FF" />
          <stop offset="1" stopColor="#4C86FF" />
        </linearGradient>
      </defs>
      {(head ? HEAD : FULL).map((d) => (
        <path key={d} d={d} pathLength="1" stroke={`url(#${gid})`} strokeWidth={head ? 2.6 : 1.75} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export function AssistantIdentity({ pending, sourceName, testId }) {
  return (
    <div className="dk-identity" data-testid={testId}>
      <CatMotif variant="head" size={22} className={pending ? "dk-cat-pending" : ""} />
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
