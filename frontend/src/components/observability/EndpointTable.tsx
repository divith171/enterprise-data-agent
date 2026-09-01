import { cn } from "@/lib/utils";
import { fmtDuration, fmtInt } from "@/lib/format";
import type { EndpointHealth } from "@/lib/telemetry/types";

const NUM_CELL = "px-4 py-3 text-right font-mono text-[12px] whitespace-nowrap";

export default function EndpointTable({ rows }: { rows: EndpointHealth[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-[#5D6880]" data-testid="endpoint-table-empty">
        No endpoint activity recorded in this range
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="endpoint-health-table">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-[#1A1F2C]">
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
              ENDPOINT
            </th>
            {["REQUESTS", "SUCCESS", "FAILURES", "AVERAGE", "P50", "P95", "MAX"].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-right text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-[#4C566E]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.path}
              data-testid={`endpoint-row-${row.path}`}
              className={cn(
                "group border-b border-[#161A24] transition-colors duration-150 last:border-b-0",
                row.primary ? "bg-[#141A29] hover:bg-[#171E2F]" : "hover:bg-[#141824]",
              )}
            >
              <td className="relative px-5 py-3">
                {row.primary && (
                  <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-[#6366F1]" />
                )}
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "font-mono text-[12.5px]",
                      row.primary ? "text-[#C7D2FE]" : "text-[#A7B0C2]",
                    )}
                  >
                    {row.path}
                  </span>
                  {row.primary && (
                    <span className="rounded-full border border-[#2E3757] bg-[#1E293B] px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em] text-[#818CF8]">
                      PRIMARY AI WORKLOAD
                    </span>
                  )}
                </div>
              </td>
              <td className={cn(NUM_CELL, "text-[#C3CAD8]")}>{fmtInt(row.requests)}</td>
              <td className={cn(NUM_CELL, "text-[#6EE7B7]")}>{fmtInt(row.success)}</td>
              <td
                className={cn(NUM_CELL, row.failures === 0 ? "text-[#5D6880]" : "text-[#FCA5A5]")}
              >
                {fmtInt(row.failures)}
              </td>
              <td className={cn(NUM_CELL, "text-[#C3CAD8]")}>{fmtDuration(row.avg)}</td>
              <td className={cn(NUM_CELL, "text-[#8A94A8]")}>{fmtDuration(row.p50)}</td>
              <td className={cn(NUM_CELL, "text-[#A5B4FC]")}>{fmtDuration(row.p95)}</td>
              <td className={cn(NUM_CELL, row.max === null ? "text-[#4C566E] italic" : "text-[#8A94A8]")}>
                {fmtDuration(row.max)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
