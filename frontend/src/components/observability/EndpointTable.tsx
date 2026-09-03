import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE, fmtDuration, fmtInt, fmtPercentSmart } from "@/lib/format";
import type { EndpointHealth } from "@/lib/telemetry/types";

type SortKey = "path" | "requests" | "success" | "failures" | "successRate" | "avg" | "p50" | "p95" | "max";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "path", label: "Endpoint", numeric: false },
  { key: "requests", label: "Requests", numeric: true },
  { key: "success", label: "Success", numeric: true },
  { key: "failures", label: "Failures", numeric: true },
  { key: "successRate", label: "Success rate", numeric: true },
  { key: "avg", label: "Average", numeric: true },
  { key: "p50", label: "P50", numeric: true },
  { key: "p95", label: "P95", numeric: true },
  { key: "max", label: "Max", numeric: true },
];

export default function EndpointTable({
  rows,
  sortable = false,
  limit,
}: {
  rows: EndpointHealth[];
  sortable?: boolean;
  limit?: number;
}) {
  const [sort, setSort] = useState<SortKey>("requests");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (!sortable) {
      return typeof limit === "number" ? list.slice(0, limit) : list;
    }
    list.sort((a, b) => {
      if (sort === "path") return desc ? b.path.localeCompare(a.path) : a.path.localeCompare(b.path);
      const av = a[sort] ?? -1;
      const bv = b[sort] ?? -1;
      return desc ? bv - av : av - bv;
    });
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }, [rows, sort, desc, sortable, limit]);

  if (rows.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-[#5D6880]" data-testid="endpoint-table-empty">
        No endpoint activity reported by this telemetry source
      </div>
    );
  }

  const toggle = (key: SortKey) => {
    if (!sortable) return;
    if (key === sort) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(true);
    }
  };

  const cell = (value: string, extra?: string) =>
    cn(
      "px-4 py-3 text-right font-mono text-[12px] whitespace-nowrap",
      value === NOT_AVAILABLE ? "text-[#4C566E] italic" : extra,
    );

  return (
    <div className="overflow-x-auto" data-testid="endpoint-health-table">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-[#1A1F2C]">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggle(col.key)}
                data-testid={`endpoint-col-${col.key}`}
                className={cn(
                  "py-2.5 text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-[#4C566E] select-none",
                  col.numeric ? "px-4 text-right" : "px-5 text-left",
                  sortable && "cursor-pointer transition-colors hover:text-[#8A94A8]",
                )}
              >
                <span className={cn("inline-flex items-center gap-1", col.numeric && "justify-end")}>
                  {col.label.toUpperCase()}
                  {sortable && sort === col.key ? (
                    desc ? (
                      <ArrowDown className="size-3" strokeWidth={2.4} />
                    ) : (
                      <ArrowUp className="size-3" strokeWidth={2.4} />
                    )
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
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
                    className={cn("font-mono text-[12.5px]", row.primary ? "text-[#C7D2FE]" : "text-[#A7B0C2]")}
                  >
                    {row.path}
                  </span>
                  {row.primary && (
                    <span className="shrink-0 rounded-full border border-[#2E3757] bg-[#1E293B] px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em] text-[#818CF8]">
                      PRIMARY AI WORKLOAD
                    </span>
                  )}
                </div>
              </td>
              <td className={cell(fmtInt(row.requests), "text-[#C3CAD8]")}>{fmtInt(row.requests)}</td>
              <td className={cell(fmtInt(row.success), "text-[#6EE7B7]")}>{fmtInt(row.success)}</td>
              <td
                className={cell(
                  fmtInt(row.failures),
                  row.failures === 0 ? "text-[#5D6880]" : "text-[#FCA5A5]",
                )}
              >
                {fmtInt(row.failures)}
              </td>
              <td className={cell(fmtPercentSmart(row.successRate), "text-[#C3CAD8]")}>
                {fmtPercentSmart(row.successRate)}
              </td>
              <td className={cell(fmtDuration(row.avg), "text-[#C3CAD8]")}>{fmtDuration(row.avg)}</td>
              <td className={cell(fmtDuration(row.p50), "text-[#8A94A8]")}>{fmtDuration(row.p50)}</td>
              <td className={cell(fmtDuration(row.p95), "text-[#A5B4FC]")}>{fmtDuration(row.p95)}</td>
              <td className={cell(fmtDuration(row.max), "text-[#8A94A8]")}>{fmtDuration(row.max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
