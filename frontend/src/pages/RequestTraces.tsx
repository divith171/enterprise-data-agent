import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import Panel from "@/components/observability/Panel";
import TraceViewerModal from "@/components/observability/TraceViewerModal";
import { EmptyState, ErrorState, OverviewSkeleton } from "@/components/observability/States";
import { fmtDateTime, fmtDuration, fmtInt } from "@/lib/format";
import type { RequestTrace, TimeRange, TraceStatus } from "@/lib/telemetry/types";
import { overviewQueryKey } from "@/lib/telemetry/source";
import { useOverview } from "@/lib/telemetry/useTelemetry";

const STATUS_STYLE: Record<TraceStatus, string> = {
  success: "border-[#0D533C] bg-[#06281E] text-[#6EE7B7]",
  retried: "border-[#543C10] bg-[#2A1E08] text-[#FDE68A]",
  failed: "border-[#4C2126] bg-[#2A1215] text-[#FCA5A5]",
};

export default function RequestTraces() {
  const [range, setRange] = useState<TimeRange>("24h");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RequestTrace | null>(null);
  const queryClient = useQueryClient();
  const { data, isPending, isFetching, isError, refetch } = useOverview(range);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: overviewQueryKey(range) });
  };

  const traces = (data?.traces ?? []).filter((t) =>
    t.question.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <Header
        title="Request Traces"
        subtitle="Individual AI request timelines and generated SQL"
        range={range}
        onRangeChange={setRange}
        lastUpdated={data?.generatedAt}
        isRefreshing={isFetching}
        onRefresh={refresh}
      />

      {isPending ? (
        <OverviewSkeleton />
      ) : isError || !data ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="px-6 py-6 xl:px-8" data-testid="request-traces-content">
          <Panel
            testid="panel-request-traces"
            title="Recent requests"
            description="Select a request to inspect its pipeline waterfall and SQL"
            flush
            action={
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
            }
          >
            {traces.length === 0 ? (
              (data.traces ?? []).length === 0 ? (
                <EmptyState
                  title="No request traces available from this telemetry source"
                  hint="The observability endpoint does not expose per-request traces"
                />
              ) : (
                <EmptyState title="No traces match this filter" hint="Try a different search term" />
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse" data-testid="traces-table">
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
                    {traces.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelected(t)}
                        data-testid={`trace-row-${t.id}`}
                        className="cursor-pointer border-b border-[#161A24] transition-colors duration-150 last:border-b-0 hover:bg-[#141824]"
                      >
                        <td className="max-w-[320px] truncate px-5 py-3 text-[12.5px] text-[#E2E8F0]">
                          {t.question}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full border px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em] ${STATUS_STYLE[t.status]}`}
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
          </Panel>
        </div>
      )}

      <TraceViewerModal trace={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
