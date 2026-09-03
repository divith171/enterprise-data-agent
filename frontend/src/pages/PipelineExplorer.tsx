import { useState } from "react";
import { X } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import Panel from "@/components/observability/Panel";
import PipelineGroupChart from "@/components/observability/PipelineGroupChart";
import StageTable from "@/components/observability/StageTable";
import StatList from "@/components/observability/StatList";
import { groupColor } from "@/lib/telemetry/colors";
import { fmtDuration, fmtInt, fmtPercentSmart } from "@/lib/format";
import type { Stage } from "@/lib/telemetry/types";

export default function PipelineExplorer() {
  const [selected, setSelected] = useState<Stage | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  return (
    <TelemetryPage
      title="Pipeline Explorer"
      subtitle="Stage-level latency investigation across the AI pipeline"
    >
      {(data) => {
        // Keep the selection in sync with refreshed telemetry.
        const live = selected ? (data.stages.find((s) => s.key === selected.key) ?? null) : null;

        return (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <Panel
                testid="panel-pipeline-groups"
                title="Pipeline groups"
                description="Average duration per group · select a group to expand its stages"
                className="xl:col-span-7"
              >
                <PipelineGroupChart
                  groups={data.pipeline}
                  onSelectStage={setSelected}
                  selectedStageKey={live?.key ?? null}
                  defaultOpen={data.pipeline[0]?.key ?? null}
                />
              </Panel>

              <Panel
                testid="panel-stage-detail"
                title={live ? live.name : "Stage detail"}
                description={
                  live
                    ? `${live.groupName} group`
                    : "Select a stage from a group or the table below"
                }
                className="xl:col-span-5"
                action={
                  live ? (
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      data-testid="btn-clear-stage-selection"
                      className="flex items-center gap-1 rounded-md border border-[#232A3B] px-2 py-1 text-[11px] text-[#8A94A8] transition-colors hover:bg-[#161B28]"
                    >
                      <X className="size-3" /> Clear
                    </button>
                  ) : undefined
                }
              >
                {live ? (
                  <div className="space-y-5" data-testid="stage-detail-content">
                    <div
                      className="h-[3px] w-full rounded-full"
                      style={{ background: groupColor(live.group) }}
                    />
                    <StatList
                      columns={2}
                      testid="stage-detail-stats"
                      items={[
                        { label: "Executions", value: fmtInt(live.executions) },
                        {
                          label: "Success rate",
                          value: fmtPercentSmart(live.successRate),
                          tone: live.successRate === 100 ? "positive" : "warning",
                        },
                        { label: "Average", value: fmtDuration(live.avg) },
                        { label: "P50", value: fmtDuration(live.p50), tone: "muted" },
                        { label: "P95", value: fmtDuration(live.p95), tone: "accent" },
                        { label: "Max", value: fmtDuration(live.max), tone: "muted" },
                        {
                          label: "Failures",
                          value: fmtInt(live.failures),
                          tone: (live.failures ?? 0) > 0 ? "negative" : "muted",
                        },
                        {
                          label: "Successes",
                          value: fmtInt(live.successCount),
                          tone: "muted",
                        },
                      ]}
                    />
                    <p className="rounded-md border border-[#1E2433] bg-[#0E111A] px-3 py-2 text-[11.5px] text-[#6E7A94]">
                      Stage key{" "}
                      <span className="font-mono text-[#8A94A8]">{live.key}</span>. These are the
                      only metrics this telemetry source reports per stage.
                    </p>
                  </div>
                ) : (
                  <div
                    className="py-14 text-center text-[13px] text-[#5D6880]"
                    data-testid="stage-detail-empty"
                  >
                    No stage selected
                  </div>
                )}
              </Panel>
            </div>

            <Panel
              testid="panel-stage-breakdown"
              title="Stage breakdown"
              description="Every instrumented stage · sort or filter to investigate"
              flush
            >
              <StageTable
                stages={data.stages}
                onSelect={setSelected}
                selectedKey={live?.key ?? null}
                groupFilter={groupFilter}
                onGroupFilterChange={setGroupFilter}
              />
            </Panel>
          </>
        );
      }}
    </TelemetryPage>
  );
}
