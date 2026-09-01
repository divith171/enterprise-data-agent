import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, AlertOctagon, Database, RefreshCcwDot, Timer } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import MetricCard from "@/components/observability/MetricCard";
import LatencyChart from "@/components/observability/LatencyChart";
import EndpointTable from "@/components/observability/EndpointTable";
import PipelineGroupChart from "@/components/observability/PipelineGroupChart";
import PerformanceHotspots from "@/components/observability/PerformanceHotspots";
import Panel from "@/components/observability/Panel";
import { ErrorState, OverviewSkeleton, StatusBanner } from "@/components/observability/States";
import { fmtDuration, fmtInt, fmtPercent, fmtSeconds, ratio } from "@/lib/format";
import { TIME_RANGE_LABELS, type TimeRange } from "@/lib/telemetry/types";
import { overviewQueryKey, RANGE_IS_SERVER_FILTERED } from "@/lib/telemetry/source";
import { useOverview } from "@/lib/telemetry/useTelemetry";

export default function Observability() {
  const [range, setRange] = useState<TimeRange>("24h");
  const queryClient = useQueryClient();
  const { data, isPending, isFetching, isError, refetch } = useOverview(range);

  // The real source is not range-filtered, so never claim a window it did not apply.
  const rangeNote = RANGE_IS_SERVER_FILTERED
    ? TIME_RANGE_LABELS[range].toLowerCase()
    : "all recorded data · source is not range-filtered";

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: overviewQueryKey(range) });
  };

  const successRate = data ? ratio(data.requests.successful, data.requests.total) : null;
  const errorRate = data ? ratio(data.requests.failed, data.requests.total) : null;
  const retryRate = data ? ratio(data.requests.retried, data.requests.total) : null;

  return (
    <AppShell>
      <Header
        title="Observability"
        subtitle="AI system health and performance"
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
        <div className="space-y-6 px-6 py-6 xl:px-8" data-testid="observability-content">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBanner
              status={data.status}
              summary={`${fmtInt(data.requests.total)} AI requests · ${rangeNote}`}
            />
            <div className="font-mono text-[11px] text-[#4C566E]">
              live telemetry · GET /api/observability/overview
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              testid="kpi-metric-ai-request-success"
              label="AI REQUEST SUCCESS"
              value={fmtPercent(successRate, 0)}
              icon={Activity}
              tone="positive"
              hint={`${fmtInt(data.requests.successful)} successful / ${fmtInt(data.requests.total)} total`}
            />
            <MetricCard
              testid="kpi-metric-ai-latency"
              label="AI LATENCY"
              value={fmtSeconds(data.latency.p95)}
              unit="P95"
              icon={Timer}
              tone="accent"
              hint={`${fmtSeconds(data.latency.avg)} average`}
            />
            <MetricCard
              testid="kpi-metric-error-rate"
              label="ERROR RATE"
              value={fmtPercent(errorRate)}
              icon={AlertOctagon}
              tone={errorRate !== null && errorRate > 0 ? "negative" : "neutral"}
              hint={`${fmtInt(data.requests.failed)} failed requests`}
            />
            <MetricCard
              testid="kpi-metric-retry-rate"
              label="RETRY RATE"
              value={fmtPercent(retryRate, 0)}
              icon={RefreshCcwDot}
              tone={retryRate !== null && retryRate > 0 ? "warning" : "neutral"}
              hint={`${fmtInt(data.requests.retried)} retried requests`}
            />
            <MetricCard
              testid="kpi-metric-sql-execution"
              label="SQL EXECUTION"
              value={fmtDuration(data.sql.avg)}
              unit="AVERAGE"
              icon={Database}
              tone="neutral"
              hint={`P95 ${fmtDuration(data.sql.p95)} · ${fmtInt(data.sql.executions)} executions`}
            />
          </div>

          <Panel
            testid="panel-request-performance"
            title="Request performance"
            description={`End-to-end AI request latency · ${rangeNote}`}
            action={
              <span className="font-mono text-[11px] text-[#4C566E]">{data.series.length} buckets</span>
            }
          >
            <LatencyChart data={data.series} />
          </Panel>

          <Panel
            testid="panel-endpoint-health"
            title="Endpoint health"
            description="Per-route traffic and latency distribution"
            flush
          >
            <EndpointTable rows={data.endpoints} />
          </Panel>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <Panel
              testid="panel-pipeline-performance"
              title="Pipeline performance"
              description="Where time is spent across the AI pipeline · select a group to expand stages"
              className="xl:col-span-7"
            >
              <PipelineGroupChart groups={data.pipeline} />
            </Panel>

            <Panel
              testid="panel-performance-hotspots"
              title="Performance hotspots"
              description="Slowest individual stages by average latency"
              className="xl:col-span-5"
            >
              <PerformanceHotspots hotspots={data.hotspots} />
            </Panel>
          </div>
        </div>
      )}
    </AppShell>
  );
}
