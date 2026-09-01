import { cn } from "@/lib/utils";
import { fmtDuration } from "@/lib/format";
import type { Hotspot, HotspotLabel } from "@/lib/telemetry/types";

const LABEL_STYLE: Record<HotspotLabel, { text: string; bg: string; border: string; bar: string }> = {
  Slowest: {
    text: "text-[#FCA5A5]",
    bg: "bg-[#2A1215]",
    border: "border-[#4C2126]",
    bar: "linear-gradient(90deg, rgba(244,63,94,0.35) 0%, #F43F5E 100%)",
  },
  "High latency": {
    text: "text-[#FCD34D]",
    bg: "bg-[#2A1E08]",
    border: "border-[#4C3A10]",
    bar: "linear-gradient(90deg, rgba(251,191,36,0.3) 0%, #FBBF24 100%)",
  },
  Elevated: {
    text: "text-[#A5B4FC]",
    bg: "bg-[#171B33]",
    border: "border-[#2E3757]",
    bar: "linear-gradient(90deg, rgba(129,140,248,0.3) 0%, #818CF8 100%)",
  },
};

export default function PerformanceHotspots({ hotspots }: { hotspots: Hotspot[] }) {
  if (hotspots.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-[#5D6880]" data-testid="hotspots-empty">
        No hotspots detected in this range
      </div>
    );
  }

  const max = Math.max(...hotspots.map((h) => h.avg ?? 0), 0.001);

  return (
    <ul className="space-y-2.5" data-testid="performance-hotspots">
      {hotspots.map((h, i) => {
        const style = LABEL_STYLE[h.label];
        const pct = h.avg === null ? 0 : Math.max(3, ((h.avg ?? 0) / max) * 100);
        return (
          <li
            key={h.stage}
            data-testid={`hotspot-item-${h.stage.toLowerCase().replace(/\s+/g, "-")}`}
            className="group rounded-lg border border-[#1A1F2C] bg-[#0F131D] px-3.5 py-3 transition-colors duration-200 hover:border-[#283044] hover:bg-[#131826]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#4C566E]">#{i + 1}</span>
                  <span className="truncate text-[13px] font-medium text-[#E9EDF5]">{h.stage}</span>
                </div>
                <div className="mt-1 text-[11px] text-[#6E7A94]">
                  {h.group} · {(h.share * 100).toFixed(0)}% of pipeline time
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[15px] text-[#F1F5F9]">{fmtDuration(h.avg)}</div>
                <span
                  className={cn(
                    "mt-1.5 inline-block rounded-full border px-2 py-[2px] text-[9px] font-semibold tracking-[0.07em]",
                    style.bg,
                    style.border,
                    style.text,
                  )}
                >
                  {h.label.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-2.5 h-[4px] overflow-hidden rounded-full bg-[#161B27]">
              <div
                className="animate-bar-grow h-full origin-left rounded-full"
                style={{ width: `${pct}%`, background: style.bar }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
