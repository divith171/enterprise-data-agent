import { Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtClock } from "@/lib/format";
import { TIME_RANGES, type TimeRange } from "@/lib/telemetry/types";

interface HeaderProps {
  title: string;
  subtitle: string;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh: () => void;
  /** null while the first request is in flight. */
  connected: boolean | null;
  /** True only when the source itself filtered by the selected range. */
  rangeFiltered: boolean;
}

export default function Header({
  title,
  subtitle,
  range,
  onRangeChange,
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  connected,
  rangeFiltered,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[#161A24] bg-[#0B0D13]/85 backdrop-blur-md"
      data-testid="page-header"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-6 pt-6 pb-5 xl:px-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1
              className="text-[27px] leading-none font-semibold tracking-[-0.026em] text-[#F8FAFC]"
              data-testid="page-title"
            >
              {title}
            </h1>
            <span
              data-testid="live-indicator"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9.5px] font-semibold tracking-[0.09em]",
                connected === null
                  ? "border-[#2B3245] bg-[#141824] text-[#8A94A8]"
                  : connected
                    ? "border-[#0D533C] bg-[#06281E] text-[#6EE7B7]"
                    : "border-[#4C2126] bg-[#2A1215] text-[#FCA5A5]",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  connected === null
                    ? "bg-[#64748B]"
                    : connected
                      ? "animate-pulse bg-[#10B981]"
                      : "bg-[#EF4444]",
                )}
              />
              {connected === null ? "CONNECTING" : connected ? "LIVE" : "DISCONNECTED"}
            </span>
          </div>
          <p className="mt-2.5 text-[13px] text-[#8A94A8]" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right leading-tight" data-testid="last-updated">
            <div className="text-[9.5px] font-medium tracking-[0.1em] text-[#4C566E]">
              LAST UPDATED
            </div>
            <div className="mt-1 font-mono text-[12px] text-[#A7B0C2]">
              {lastUpdated ? fmtClock(lastUpdated) : "—"}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="btn-refresh-telemetry"
            className="flex items-center gap-2 rounded-md border border-[#232A3B] bg-[#11141E] px-3 py-[7px] text-[12px] text-[#C3CAD8] transition-[border-color,background-color,transform] duration-150 hover:border-[#31394F] hover:bg-[#161B28] active:scale-[0.98] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} strokeWidth={2} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>

          <div
            className="flex items-center gap-0.5 rounded-md border border-[#232A3B] bg-[#0E111A] p-0.5"
            data-testid="time-range-selector"
          >
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                data-testid={`time-range-${r}`}
                aria-pressed={r === range}
                className={cn(
                  "rounded-[5px] px-2.5 py-[5px] font-mono text-[12px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none",
                  r === range
                    ? "bg-[#1E2333] text-[#EEF2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-[#6E7A94] hover:text-[#C3CAD8]",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!rangeFiltered && (
        <div
          className="flex items-center gap-2 border-t border-[#141824] bg-[#0A0C12] px-6 py-[7px] text-[11.5px] text-[#6E7A94] xl:px-10"
          data-testid="range-not-filtered-note"
        >
          <Info className="size-3.5 shrink-0 text-[#4C566E]" strokeWidth={1.9} />
          The current telemetry source returns aggregate totals and does not filter by time
          range. Range controls are retained for future source support.
        </div>
      )}
    </header>
  );
}
