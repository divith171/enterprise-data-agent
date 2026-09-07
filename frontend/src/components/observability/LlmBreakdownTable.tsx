import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE, fmtCost, fmtDuration, fmtInt, fmtTokens } from "@/lib/format";
import type { LlmBreakdown } from "@/lib/telemetry/types";

type SortKey =
  | "name"
  | "calls"
  | "inputTokens"
  | "outputTokens"
  | "totalTokens"
  | "estimatedCost"
  | "costPerCall"
  | "costPer1kTokens"
  | "tokensPerCall"
  | "avg"
  | "p95";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Name", numeric: false },
  { key: "calls", label: "Calls", numeric: true },
  { key: "inputTokens", label: "Input", numeric: true },
  { key: "outputTokens", label: "Output", numeric: true },
  { key: "totalTokens", label: "Total tokens", numeric: true },
  { key: "estimatedCost", label: "Est. cost", numeric: true },
  { key: "costPerCall", label: "Cost / call", numeric: true },
  { key: "costPer1kTokens", label: "Cost / 1k tok", numeric: true },
  { key: "tokensPerCall", label: "Tokens / call", numeric: true },
  { key: "avg", label: "Avg", numeric: true },
  { key: "p95", label: "P95", numeric: true },
];

/**
 * One table for all three LLM breakdowns (provider / model / layer). Cost columns are
 * framed for engineering triage — unit economics per call and per 1k tokens — rather
 * than as a customer invoice.
 */
export default function LlmBreakdownTable({
  rows,
  /** Monospace the name column for model identifiers. */
  monoNames = false,
  emptyLabel,
  testid,
}: {
  rows: LlmBreakdown[];
  monoNames?: boolean;
  emptyLabel: string;
  testid: string;
}) {
  const [sort, setSort] = useState<SortKey>("estimatedCost");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      if (sort === "name") return desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      const av = a[sort] ?? -1;
      const bv = b[sort] ?? -1;
      return desc ? bv - av : av - bv;
    });
    return list;
  }, [rows, sort, desc]);

  if (rows.length === 0) {
    return (
      <div
        className="px-5 py-12 text-center text-[13px] text-[#5D6880]"
        data-testid={`${testid}-empty`}
      >
        {emptyLabel}
      </div>
    );
  }

  const toggle = (key: SortKey) => {
    if (key === sort) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(true);
    }
  };

  const maxCost = Math.max(...rows.map((r) => r.estimatedCost ?? 0), 0.000001);

  const cell = (value: string, extra?: string) =>
    cn(
      "px-4 py-3 text-right font-mono text-[12px] whitespace-nowrap",
      value === NOT_AVAILABLE ? "text-[#4C566E] italic" : extra,
    );

  return (
    <div className="overflow-x-auto" data-testid={testid}>
      <table className="w-full min-w-[1000px] border-collapse">
        <thead>
          <tr className="border-b border-[#1A1F2C]">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggle(col.key)}
                data-testid={`${testid}-col-${col.key}`}
                className={cn(
                  "cursor-pointer py-2.5 text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-[#4C566E] transition-colors select-none hover:text-[#8A94A8]",
                  col.numeric ? "px-4 text-right" : "px-5 text-left",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label.toUpperCase()}
                  {sort === col.key ? (
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
              key={row.key}
              data-testid={`${testid}-row-${row.key}`}
              className="border-b border-[#161A24] transition-colors duration-150 last:border-b-0 hover:bg-[#141824]"
            >
              <td className="px-5 py-3">
                <div
                  className={cn(
                    "text-[12.5px] text-[#E9EDF5]",
                    monoNames && "font-mono text-[12px]",
                  )}
                >
                  {row.name}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-[3px] w-[120px] overflow-hidden rounded-full bg-[#161B27]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, ((row.estimatedCost ?? 0) / maxCost) * 100)}%`,
                        background: "linear-gradient(90deg, rgba(129,140,248,0.4), #818CF8)",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-[#4C566E]">
                    {row.costShare === null ? "—" : `${row.costShare.toFixed(1)}% of cost`}
                  </span>
                </div>
              </td>
              <td className={cell(fmtInt(row.calls), "text-[#C3CAD8]")}>{fmtInt(row.calls)}</td>
              <td className={cell(fmtTokens(row.inputTokens), "text-[#8A94A8]")}>
                {fmtTokens(row.inputTokens)}
              </td>
              <td className={cell(fmtTokens(row.outputTokens), "text-[#8A94A8]")}>
                {fmtTokens(row.outputTokens)}
              </td>
              <td className={cell(fmtTokens(row.totalTokens), "text-[#C3CAD8]")}>
                {fmtTokens(row.totalTokens)}
              </td>
              <td className={cell(fmtCost(row.estimatedCost), "text-[#A5B4FC]")}>
                {fmtCost(row.estimatedCost)}
              </td>
              <td className={cell(fmtCost(row.costPerCall), "text-[#8A94A8]")}>
                {fmtCost(row.costPerCall)}
              </td>
              <td className={cell(fmtCost(row.costPer1kTokens), "text-[#8A94A8]")}>
                {fmtCost(row.costPer1kTokens)}
              </td>
              <td className={cell(fmtTokens(row.tokensPerCall), "text-[#8A94A8]")}>
                {fmtTokens(row.tokensPerCall)}
              </td>
              <td className={cell(fmtDuration(row.avg), "text-[#C3CAD8]")}>
                {fmtDuration(row.avg)}
              </td>
              <td className={cell(fmtDuration(row.p95), "text-[#A5B4FC]")}>
                {fmtDuration(row.p95)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
