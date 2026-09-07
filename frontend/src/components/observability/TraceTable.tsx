import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDateTime, fmtDuration, fmtInt } from "@/lib/format";
import type { RequestTrace, TraceStatus } from "@/lib/telemetry/types";

const STATUS_STYLE: Record<TraceStatus, string> = {
  success: "border-[#0D533C] bg-[#06281E] text-[#6EE7B7]",
  retried: "border-[#543C10] bg-[#2A1E08] text-[#FDE68A]",
  failed: "border-[#4C2126] bg-[#2A1215] text-[#FCA5A5]",
};

/**
 * Renders request-level traces when a telemetry source provides them. Kept separate from
 * the page so a future traces API needs no page changes.
 */
export default function TraceTable({
  traces,
  onSelect,
}: {
  traces: RequestTrace[];
  onSelect: (trace: RequestTrace) => void;
}) {
  const [query, setQuery] = useState("");
  const rows = traces.filter((t) =>
    t.question.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div data-testid="trace-table">
      <div className="flex items-center gap-2 border-b border-[#1A1F2C] px-5 py-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#4C566E]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter questions"
            data-testid="trace-search-input"
            className="w-[220px] rounded-md border border-[#232A3B] bg-[#0E111A] py-[6px] pr-3 pl-8 text-[12px] text-[#E2E8F0] placeholder:text-[#4C566E] focus-visible:border-[#3B4764] focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none"
          />
        </div>
        <span className="ml-auto font-mono text-[11px] text-[#4C566E]">
          {rows.length} of {traces.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-[13px] text-[#5D6880]" data-testid="trace-filter-empty">
          No traces match this filter
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse" data-testid="traces-table">
            <thead>
              <tr className="border-b border-[#1A1F2C]">
                {["QUESTION", "STATUS", "STARTED"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]"
                  >
                    {h}
                  </th>
                ))}
                {["TOTAL", "SQL", "ROWS", "RETRIES"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-right text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t)}
                  data-testid={`trace-row-${t.id}`}
                  className="cursor-pointer border-b border-[#161A24] transition-colors duration-150 last:border-b-0 hover:bg-[#141824]"
                >
                  <td className="max-w-[320px] truncate px-5 py-3 text-[12.5px] text-[#E2E8F0]">
                    {t.question}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em]",
                        STATUS_STYLE[t.status],
                      )}
                    >
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11.5px] whitespace-nowrap text-[#7C8698]">
                    {fmtDateTime(t.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] text-[#F1F5F9]">
                    {fmtDuration(t.totalSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] text-[#A5B4FC]">
                    {fmtDuration(t.sqlSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] text-[#8A94A8]">
                    {fmtInt(t.rows)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] text-[#5D6880]">
                    {fmtInt(t.retries)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
