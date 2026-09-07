import { cn } from "@/lib/utils";
import { fmtDuration, fmtInt } from "@/lib/format";
import { stageShare } from "@/lib/telemetry/derive";
import { groupColor } from "@/lib/telemetry/colors";
import type { Stage } from "@/lib/telemetry/types";

/**
 * Highest-latency stages built from the real stage metrics the source provides.
 * Ranking is a derivation of real averages — no hotspot records are invented.
 */
export default function TopStages({
  stages,
  allStages,
  onSelect,
  selectedKey,
}: {
  stages: Stage[];
  allStages: Stage[];
  onSelect?: (stage: Stage) => void;
  selectedKey?: string | null;
}) {
  if (stages.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-[#5D6880]" data-testid="top-stages-empty">
        No stage timings reported by this telemetry source
      </div>
    );
  }

  const max = Math.max(...stages.map((s) => s.avg ?? 0), 0.001);

  return (
    <ol className="space-y-1" data-testid="top-stages">
      {stages.map((stage, i) => {
        const color = groupColor(stage.group);
        const pct = Math.max(2, ((stage.avg ?? 0) / max) * 100);
        const share = stageShare(stage, allStages);
        const selected = selectedKey === stage.key;
        const className = cn(
          "block w-full rounded-lg px-3 py-2.5 text-left transition-[background-color,border-color] duration-200",
          "border border-transparent hover:bg-[#131723]",
          selected && "border-[#2E3757] bg-[#141A29]",
          onSelect &&
            "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none",
        );

        const body = (
          <>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-4 shrink-0 font-mono text-[10px] text-[#4C566E]">
                    {i + 1}
                  </span>
                  <span className="truncate text-[13px] text-[#E2E8F0]">{stage.name}</span>
                </div>
                <span className="shrink-0 font-mono text-[13px] text-[#F1F5F9]">
                  {fmtDuration(stage.avg)}
                </span>
              </div>
              <div className="mt-2 ml-[26px] flex items-center gap-3">
                <span
                  className="shrink-0 rounded-full px-2 py-[1px] text-[9px] font-semibold tracking-[0.07em]"
                  style={{ background: `${color}1A`, color, border: `1px solid ${color}33` }}
                >
                  {stage.groupName.toUpperCase()}
                </span>
                <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#161B27]">
                  <div
                    className="animate-bar-grow h-full origin-left rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}59 0%, ${color} 100%)`,
                    }}
                  />
                </div>
                <span className="hidden shrink-0 font-mono text-[10.5px] text-[#6E7A94] sm:inline">
                  P95 {fmtDuration(stage.p95)}
                </span>
                <span className="hidden shrink-0 font-mono text-[10.5px] text-[#5D6880] lg:inline">
                  {fmtInt(stage.executions)} exec
                </span>
                <span className="w-[46px] shrink-0 text-right font-mono text-[10.5px] text-[#4C566E]">
                  {(share * 100).toFixed(1)}%
                </span>
              </div>
            </>
        );

        return (
          <li key={stage.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(stage)}
                data-testid={`top-stage-${stage.key}`}
                className={className}
              >
                {body}
              </button>
            ) : (
              <div data-testid={`top-stage-${stage.key}`} className={className}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
