import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import Panel from "@/components/observability/Panel";
import PipelineGroupChart from "@/components/observability/PipelineGroupChart";
import { ErrorState, OverviewSkeleton } from "@/components/observability/States";
import { fmtDuration, fmtInt } from "@/lib/format";
import { TIME_RANGE_LABELS, type TimeRange } from "@/lib/telemetry/types";
import { overviewQueryKey, RANGE_IS_SERVER_FILTERED } from "@/lib/telemetry/source";
import { useOverview } from "@/lib/telemetry/useTelemetry";

export default function PipelineExplorer() {
  const [range, setRange] = useState<TimeRange>("24h");
  const queryClient = useQueryClient();
  const { data, isPending, isFetching, isError, refetch } = useOverview(range);

  const rangeNote = RANGE_IS_SERVER_FILTERED
    ? TIME_RANGE_LABELS[range].toLowerCase()
    : "all recorded data · source is not range-filtered";

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: overviewQueryKey(range) });
  };

  const stages = (data?.pipeline ?? []).flatMap((g) =>
    g.stages.map((s) => ({ ...s, group: g.name })),
  );
  const stageMax = Math.max(...stages.map((s) => s.avg ?? 0), 0.001);

  return (
    <AppShell>
      <Header
        title="Pipeline Explorer"
        subtitle="Stage-level latency breakdown of the AI pipeline"
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
        <div className="space-y-6 px-6 py-6 xl:px-8" data-testid="pipeline-explorer-content">
          <Panel
            testid="panel-pipeline-groups"
            title="Pipeline groups"
            description={`Average latency per group · ${rangeNote}`}
          >
            <PipelineGroupChart groups={data.pipeline} />
          </Panel>

          <Panel
            testid="panel-stage-breakdown"
            title="Stage breakdown"
            description="Every instrumented stage, ranked by average latency"
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse" data-testid="stage-breakdown-table">
                <thead>
                  <tr className="border-b border-[#1A1F2C]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                      STAGE
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                      GROUP
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                      SHARE
                    </th>
                    {["EXECUTIONS", "AVERAGE", "P95", "FAILURES"].map((h) => (
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
                  {[...stages]
                    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
                    .map((s) => (
                      <tr
                        key={`${s.group}-${s.name}`}
                        data-testid={`stage-row-${s.name.toLowerCase().replace(/\s+/g, "-")}`}
                        className="border-b border-[#161A24] transition-colors duration-150 last:border-b-0 hover:bg-[#141824]"
                      >
                        <td className="px-5 py-3 text-[12.5px] text-[#E2E8F0]">{s.name}</td>
                        <td className="px-4 py-3 text-[12px] text-[#7C8698]">{s.group}</td>
                        <td className="px-4 py-3">
                          <div className="h-[4px] w-[110px] overflow-hidden rounded-full bg-[#161B27]">
                            <div
                              className="h-full rounded-full bg-[#818CF8]/80"
                              style={{ width: `${Math.max(3, ((s.avg ?? 0) / stageMax) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-[#C3CAD8]">
                          {fmtInt(s.executions)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-[#F1F5F9]">
                          {fmtDuration(s.avg)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-[#A5B4FC]">
                          {fmtDuration(s.p95)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono text-[12px] ${
                            s.failures === 0 ? "text-[#5D6880]" : "text-[#FCA5A5]"
                          }`}
                        >
                          {fmtInt(s.failures)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
