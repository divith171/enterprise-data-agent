/** Stable colour per pipeline group, keyed by the backend's group key. */
const GROUP_COLOR: Record<string, string> = {
  understanding: "#38BDF8",
  retrieval: "#34D399",
  planning: "#818CF8",
  validation: "#A78BFA",
  generation: "#FBBF24",
  execution: "#F472B6",
};

const FALLBACK = "#64748B";

export function groupColor(groupKey: string): string {
  return GROUP_COLOR[groupKey.toLowerCase()] ?? FALLBACK;
}
