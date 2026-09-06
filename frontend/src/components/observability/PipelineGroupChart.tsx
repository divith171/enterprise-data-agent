import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtInt } from "@/lib/format";
import { bottleneckGroups } from "@/lib/telemetry/derive";
import { groupColor } from "@/lib/telemetry/colors";
import type { PipelineGroup, Stage } from "@/lib/telemetry/types";

export default function PipelineGroupChart({
  groups,
  onSelectStage,
  selectedStageKey,
  defaultOpen,
}: {
  groups: PipelineGroup[];
  onSelectStage?: (stage: Stage) => void;
  selectedStageKey?: string | null;
  defaultOpen?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);

  if (groups.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-[#5D6880]" data-testid="pipeline-chart-empty">
        No pipeline groups reported by this telemetry source
      </div>
    );
  }

  const max = Math.max(...groups.map((g) => g.avg ?? 0), 0.001);
  const bottlenecks = bottleneckGroups(groups);

  return (
    <div className="space-y-1" data-testid="pipeline-group-chart">
      {groups.map((group) => {
        const color = groupColor(group.key);
        const pct = group.avg === null ? 0 : Math.max(2, ((group.avg ?? 0) / max) * 100);
        const isBottleneck = bottlenecks.has(group.key);
        const isOpen = open === group.key;

        return (
          <div
            key={group.key}
            data-testid={`pipeline-group-${group.key}`}
            className={cn(
              "rounded-lg border transition-[background-color,border-color] duration-200",
              isOpen ? "border-[#252D3E] bg-[#131723]" : "border-transparent hover:bg-[#131723]",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : group.key)}
              aria-expanded={isOpen}
              data-testid={`pipeline-group-toggle-${group.key}`}
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
                  <span className="truncate text-[13px] font-medium text-[#E2E8F0]">
                    {group.name}
                  </span>
                  {isBottleneck && (
                    <span
                      title="This group's average duration is above the even share across measured groups. It reflects share of total duration, not a critical-path or causal analysis."
                      className="shrink-0 rounded-full px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em]"
                      style={{ background: `${color}1F`, color, border: `1px solid ${color}3D` }}
                    >
                      HIGH SHARE
                    </span>
                  )}
                  <span className="shrink-0 text-[10.5px] text-[#4C566E]">
                    {group.stages.length} stage{group.stages.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4 font-mono text-[11.5px]">
                  <span className="hidden text-[#6E7A94] sm:inline">
                    {fmtInt(group.executions)} exec
                  </span>
                  <span className="hidden text-[#6E7A94] md:inline">P95 {fmtDuration(group.p95)}</span>
                  <span
                    className={cn(
                      "hidden lg:inline",
                      group.failures === 0 ? "text-[#5D6880]" : "text-[#FCA5A5]",
                    )}
                  >
                    {fmtInt(group.failures)} fail
                  </span>
                  <span className="w-[66px] text-right text-[13px] text-[#F1F5F9]">
                    {fmtDuration(group.avg)}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 ml-[22px] h-[7px] overflow-hidden rounded-full bg-[#161B27]">
                <div
                  className="animate-bar-grow h-full origin-left rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}4D 0%, ${color}${isBottleneck ? "" : "B3"} 100%)`,
                    boxShadow: isBottleneck ? `0 0 14px -3px ${color}80` : "none",
                  }}
                />
              </div>
            </button>

            {isOpen && (
              <div
                className="animate-rise border-t border-[#1A1F2C] px-3 py-2.5"
                data-testid={`pipeline-substages-${group.key}`}
              >
                {group.stages.length === 0 ? (
                  <div className="py-3 text-center text-[12px] text-[#5D6880]">
                    No stages reported for this group
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {group.stages.map((stage) => {
                      const sMax = Math.max(...group.stages.map((s) => s.avg ?? 0), 0.001);
                      const sPct =
                        stage.avg === null ? 0 : Math.max(2, ((stage.avg ?? 0) / sMax) * 100);
                      const selected = selectedStageKey === stage.key;
                      const inner = (
                        <>
                          <span className="w-[168px] shrink-0 truncate text-left text-[12px] text-[#A7B0C2]">
                            {stage.name}
                          </span>
                          <div className="h-[4px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#161B27]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${sPct}%`, background: `${color}99` }}
                            />
                          </div>
                          <span className="w-[60px] shrink-0 text-right font-mono text-[11.5px] text-[#C3CAD8]">
                            {fmtDuration(stage.avg)}
                          </span>
                          <span className="hidden w-[78px] shrink-0 text-right font-mono text-[11px] text-[#6E7A94] md:block">
                            P95 {fmtDuration(stage.p95)}
                          </span>
                        </>
                      );
                      const cls = cn(
                        "flex w-full items-center gap-3 rounded-md px-[22px] py-1.5 transition-colors",
                        selected ? "bg-[#171E2F]" : "hover:bg-[#171C2A]",
                      );
                      return (
                        <li key={stage.key}>
                          {onSelectStage ? (
                            <button
                              type="button"
                              className={cn(cls, "cursor-pointer")}
                              onClick={() => onSelectStage(stage)}
                              data-testid={`substage-${stage.key}`}
                            >
                              {inner}
                            </button>
                          ) : (
                            <div className={cls} data-testid={`substage-${stage.key}`}>
                              {inner}
                            </div>
                          )}
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
