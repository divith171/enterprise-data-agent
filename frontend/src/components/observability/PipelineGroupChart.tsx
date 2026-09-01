import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtInt } from "@/lib/format";
import type { PipelineGroup } from "@/lib/telemetry/types";

const GROUP_COLOR: Record<string, string> = {
  Understanding: "#38BDF8",
  Retrieval: "#34D399",
  Planning: "#818CF8",
  Validation: "#A78BFA",
  Generation: "#FBBF24",
};

const FALLBACK_COLOR = "#64748B";

export default function PipelineGroupChart({ groups }: { groups: PipelineGroup[] }) {
  const [open, setOpen] = useState<string | null>("Planning");

  if (groups.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-[#5D6880]" data-testid="pipeline-chart-empty">
        No pipeline executions in this range
      </div>
    );
  }

  const max = Math.max(...groups.map((g) => g.avg ?? 0), 0.001);
  const total = groups.reduce((a, g) => a + (g.avg ?? 0), 0);
  // A stage is a bottleneck when it eats a disproportionate share of the pipeline budget.
  const bottleneckFloor = total / groups.length;

  return (
    <div className="space-y-1" data-testid="pipeline-group-chart">
      {groups.map((group) => {
        const color = GROUP_COLOR[group.name] ?? FALLBACK_COLOR;
        const avg = group.avg;
        const pct = avg === null ? 0 : Math.max(2, (avg / max) * 100);
        const isBottleneck = (avg ?? 0) > bottleneckFloor;
        const isOpen = open === group.name;

        return (
          <div
            key={group.name}
            data-testid={`pipeline-group-${group.name.toLowerCase()}`}
            className={cn(
              "rounded-lg border transition-colors duration-200",
              isOpen ? "border-[#252D3E] bg-[#131723]" : "border-transparent hover:bg-[#131723]",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : group.name)}
              aria-expanded={isOpen}
              data-testid={`pipeline-group-toggle-${group.name.toLowerCase()}`}
              className="w-full cursor-pointer px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-[#5D6880] transition-transform duration-200",
                      isOpen && "rotate-90",
                    )}
                    strokeWidth={2.2}
                  />
                  <span className="truncate text-[13px] font-medium text-[#E2E8F0]">{group.name}</span>
                  {isBottleneck && (
                    <span
                      className="rounded-full px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em]"
                      style={{ background: `${color}1F`, color, border: `1px solid ${color}3D` }}
                    >
                      BOTTLENECK
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4 font-mono text-[11.5px]">
                  <span className="hidden text-[#6E7A94] sm:inline">
                    {fmtInt(group.executions)} exec
                  </span>
                  <span className="hidden text-[#6E7A94] md:inline">P95 {fmtDuration(group.p95)}</span>
                  <span className={group.failures === 0 ? "hidden text-[#5D6880] lg:inline" : "text-[#FCA5A5]"}>
                    {fmtInt(group.failures)} fail
                  </span>
                  <span className="w-[62px] text-right text-[13px] text-[#F1F5F9]">{fmtDuration(avg)}</span>
                </div>
              </div>

              <div className="mt-2.5 ml-[22px] h-[7px] overflow-hidden rounded-full bg-[#161B27]">
                <div
                  className="animate-bar-grow h-full origin-left rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isBottleneck
                      ? `linear-gradient(90deg, ${color}66 0%, ${color} 100%)`
                      : `linear-gradient(90deg, ${color}4D 0%, ${color}B3 100%)`,
                    boxShadow: isBottleneck ? `0 0 12px -2px ${color}80` : "none",
                  }}
                />
              </div>
            </button>

            {isOpen && (
              <div className="animate-rise border-t border-[#1A1F2C] px-3 py-2.5" data-testid={`pipeline-substages-${group.name.toLowerCase()}`}>
                {group.stages.length === 0 ? (
                  <div className="py-3 text-center text-[12px] text-[#5D6880]">No data</div>
                ) : (
                  <ul className="space-y-1.5">
                    {group.stages.map((stage) => {
                      const sMax = Math.max(...group.stages.map((s) => s.avg ?? 0), 0.001);
                      const sPct = stage.avg === null ? 0 : Math.max(2, ((stage.avg ?? 0) / sMax) * 100);
                      return (
                        <li
                          key={stage.name}
                          className="flex items-center gap-3 rounded-md px-[22px] py-1.5 transition-colors hover:bg-[#171C2A]"
                        >
                          <span className="w-[150px] shrink-0 truncate text-[12px] text-[#A7B0C2]">
                            {stage.name}
                          </span>
                          <div className="h-[4px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#161B27]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${sPct}%`, background: `${color}99` }}
                            />
                          </div>
                          <span className="w-[56px] shrink-0 text-right font-mono text-[11.5px] text-[#C3CAD8]">
                            {fmtDuration(stage.avg)}
                          </span>
                          <span className="hidden w-[74px] shrink-0 text-right font-mono text-[11px] text-[#6E7A94] md:block">
                            P95 {fmtDuration(stage.p95)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
