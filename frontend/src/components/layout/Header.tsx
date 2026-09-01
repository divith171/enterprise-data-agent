import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtClock } from "@/lib/format";
import { TIME_RANGES, type TimeRange } from "@/lib/telemetry/types";

interface HeaderProps {
  title: string;
  subtitle: string;
  range?: TimeRange;
  onRangeChange?: (range: TimeRange) => void;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export default function Header({
  title,
  subtitle,
  range,
  onRangeChange,
  lastUpdated,
  isRefreshing = false,
  onRefresh,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[#161A24] bg-[#0B0D13]/85 px-6 py-5 backdrop-blur-md xl:px-8"
      data-testid="page-header"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1
            className="text-[26px] leading-none font-semibold tracking-[-0.025em] text-[#F8FAFC]"
            data-testid="page-title"
          >
            {title}
          </h1>
          <p className="mt-2 text-[13px] text-[#8A94A8]" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated !== undefined && (
            <div className="text-right leading-tight" data-testid="last-updated">
              <div className="text-[10px] font-medium tracking-[0.1em] text-[#4C566E]">LAST UPDATED</div>
              <div className="mt-1 font-mono text-[12px] text-[#A7B0C2]">{fmtClock(lastUpdated)}</div>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              data-testid="btn-refresh-telemetry"
              className="flex items-center gap-2 rounded-md border border-[#232A3B] bg-[#11141E] px-3 py-[7px] text-[12px] text-[#C3CAD8] transition-colors duration-150 hover:border-[#31394F] hover:bg-[#161B28] active:scale-[0.98] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} strokeWidth={2} />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          )}

          {range && onRangeChange && (
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
          )}
        </div>
      </div>
    </header>
  );
}
