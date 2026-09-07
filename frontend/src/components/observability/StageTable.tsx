import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE, fmtDuration, fmtInt, fmtPercentSmart } from "@/lib/format";
import { groupColor } from "@/lib/telemetry/colors";
import type { Stage } from "@/lib/telemetry/types";

type SortKey = "name" | "group" | "executions" | "avg" | "p50" | "p95" | "max" | "failures";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Stage", numeric: false },
  { key: "group", label: "Group", numeric: false },
  { key: "executions", label: "Executions", numeric: true },
  { key: "avg", label: "Average", numeric: true },
  { key: "p50", label: "P50", numeric: true },
  { key: "p95", label: "P95", numeric: true },
  { key: "max", label: "Max", numeric: true },
  { key: "failures", label: "Failures", numeric: true },
];

/** Sortable, filterable stage table. Shows only metrics the source actually reports. */
export default function StageTable({
  stages,
  onSelect,
  selectedKey,
  groupFilter,
  onGroupFilterChange,
}: {
  stages: Stage[];
  onSelect?: (stage: Stage) => void;
  selectedKey?: string | null;
  groupFilter?: string | null;
  onGroupFilterChange?: (group: string | null) => void;
}) {
  const [sort, setSort] = useState<SortKey>("avg");
  const [desc, setDesc] = useState(true);
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () => Array.from(new Set(stages.map((s) => s.group))).sort(),
    [stages],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = stages.filter(
      (s) =>
        (groupFilter ? s.group === groupFilter : true) &&
        (q === "" || s.name.toLowerCase().includes(q) || s.groupName.toLowerCase().includes(q)),
    );
    list.sort((a, b) => {
      if (sort === "name") return desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      if (sort === "group")
        return desc ? b.groupName.localeCompare(a.groupName) : a.groupName.localeCompare(b.groupName);
      const av = a[sort] ?? -1;
      const bv = b[sort] ?? -1;
      return desc ? bv - av : av - bv;
    });
    return list;
  }, [stages, query, sort, desc, groupFilter]);

  const toggle = (key: SortKey) => {
    if (key === sort) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(true);
    }
  };

  const maxAvg = Math.max(...stages.map((s) => s.avg ?? 0), 0.001);

  const cell = (value: string, extra?: string) =>
    cn(
      "px-4 py-3 text-right font-mono text-[12px] whitespace-nowrap",
      value === NOT_AVAILABLE ? "text-[#4C566E] italic" : extra,
    );

  return (
    <div data-testid="stage-table">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1A1F2C] px-5 py-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#4C566E]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter stages"
            data-testid="stage-filter-input"
            className="w-[200px] rounded-md border border-[#232A3B] bg-[#0E111A] py-[6px] pr-3 pl-8 text-[12px] text-[#E2E8F0] placeholder:text-[#4C566E] focus-visible:border-[#3B4764] focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none"
          />
        </div>

        {onGroupFilterChange && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onGroupFilterChange(null)}
              data-testid="stage-group-filter-all"
              className={cn(
                "rounded-md px-2.5 py-[5px] text-[11.5px] transition-colors",
                groupFilter === null
                  ? "bg-[#1E2333] text-[#EEF2FF]"
                  : "text-[#6E7A94] hover:text-[#C3CAD8]",
              )}
            >
              All groups
            </button>
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGroupFilterChange(groupFilter === g ? null : g)}
                data-testid={`stage-group-filter-${g}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[11.5px] transition-colors",
                  groupFilter === g
                    ? "bg-[#1E2333] text-[#EEF2FF]"
                    : "text-[#6E7A94] hover:text-[#C3CAD8]",
                )}
              >
                <span className="size-1.5 rounded-full" style={{ background: groupColor(g) }} />
                {stages.find((s) => s.group === g)?.groupName ?? g}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto font-mono text-[11px] text-[#4C566E]" data-testid="stage-count">
          {rows.length} of {stages.length} stages
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-[13px] text-[#5D6880]" data-testid="stage-table-empty">
          No stages match this filter
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-[#1A1F2C]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggle(col.key)}
                    data-testid={`stage-col-${col.key}`}
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
              {rows.map((s) => (
                <tr
                  key={s.key}
                  onClick={() => onSelect?.(s)}
                  data-testid={`stage-row-${s.key}`}
                  className={cn(
                    "border-b border-[#161A24] transition-colors duration-150 last:border-b-0",
                    onSelect && "cursor-pointer",
                    selectedKey === s.key ? "bg-[#141A29]" : "hover:bg-[#141824]",
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: groupColor(s.group) }}
                      />
                      <span className="text-[12.5px] text-[#E2E8F0]">{s.name}</span>
                    </div>
                    <div className="mt-1.5 ml-4 h-[3px] w-[150px] overflow-hidden rounded-full bg-[#161B27]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, ((s.avg ?? 0) / maxAvg) * 100)}%`,
                          background: `${groupColor(s.group)}B3`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[#7C8698]">{s.groupName}</td>
                  <td className={cell(fmtInt(s.executions), "text-[#C3CAD8]")}>
                    {fmtInt(s.executions)}
                  </td>
                  <td className={cell(fmtDuration(s.avg), "text-[#F1F5F9]")}>{fmtDuration(s.avg)}</td>
                  <td className={cell(fmtDuration(s.p50), "text-[#8A94A8]")}>{fmtDuration(s.p50)}</td>
                  <td className={cell(fmtDuration(s.p95), "text-[#A5B4FC]")}>{fmtDuration(s.p95)}</td>
                  <td className={cell(fmtDuration(s.max), "text-[#8A94A8]")}>{fmtDuration(s.max)}</td>
                  <td
                    className={cell(
                      fmtInt(s.failures),
                      s.failures === 0 ? "text-[#5D6880]" : "text-[#FCA5A5]",
                    )}
                  >
                    {fmtInt(s.failures)}
                    {s.successRate !== null && s.failures !== null && s.failures > 0 && (
                      <span className="ml-2 text-[10px] text-[#6E7A94]">
                        {fmtPercentSmart(s.successRate)} ok
                      </span>
                    )}
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
