import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Database, LineChart, Repeat2, Sparkles, Timer, TriangleAlert } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import MetricCard from "@/components/observability/MetricCard";
import LatencyChart from "@/components/observability/LatencyChart";
import EndpointTable from "@/components/observability/EndpointTable";
import PipelineGroupChart from "@/components/observability/PipelineGroupChart";
import TopStages from "@/components/observability/TopStages";
import Panel from "@/components/observability/Panel";
import StatList from "@/components/observability/StatList";
import { StatusBanner, Unavailable } from "@/components/observability/States";
import { fmtCost, fmtDuration, fmtInt, fmtPercent, fmtPercentSmart, fmtSeconds, fmtTokens } from "@/lib/format";
import { bottleneckGroups, topStages } from "@/lib/telemetry/derive";

const drillLink =
  "inline-flex items-center gap-1 text-[11.5px] text-[#818CF8] transition-colors hover:text-[#A5B4FC]";

export default function Overview() {
  return (
    <TelemetryPage
      title="Overview"
      subtitle="AI system health and performance at a glance"
      prominentDisclosure
    >
      {(data) => {
        const ranked = topStages(data.stages, 6);
        const bottlenecks = bottleneckGroups(data.pipeline);
        const firstBottleneck = data.pipeline.find((g) => bottlenecks.has(g.key));
        const topLlmCost = data.llm?.byProvider[0] ?? null;

        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBanner
                status={data.status}
                summary={
                  data.requests.total === null
                    ? "No AI request totals reported"
                    : `${fmtInt(data.requests.total)} AI requests · ${fmtInt(data.requests.failed)} failed · ${fmtInt(data.requests.retried)} retried`
                }
              />
              {firstBottleneck && (
                <div className="text-[12px] text-[#8A94A8]">
                  Slowest pipeline group:{" "}
                  <span className="text-[#E2E8F0]">{firstBottleneck.name}</span>{" "}
                  <span className="font-mono text-[#A5B4FC]">{fmtDuration(firstBottleneck.avg)}</span>
                </div>
              )}
            </div>

            {/* ---------------------------- KPI row ---------------------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <MetricCard
                testid="kpi-metric-ai-request-success"
                label="AI REQUEST SUCCESS"
                value={fmtPercentSmart(data.requests.successRate)}
                icon={Activity}
                tone={data.requests.successRate === 100 ? "positive" : "warning"}
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
                value={fmtPercent(data.requests.failureRate)}
                icon={TriangleAlert}
                tone={(data.requests.failed ?? 0) > 0 ? "negative" : "neutral"}
                hint={`${fmtInt(data.requests.failed)} failed requests`}
              />
              <MetricCard
                testid="kpi-metric-retry-rate"
                label="RETRY RATE"
                value={fmtPercentSmart(data.retries.retryRate)}
                icon={Repeat2}
                tone={(data.retries.requestsRetried ?? 0) > 0 ? "warning" : "neutral"}
                hint={`${fmtInt(data.retries.requestsRetried)} retried requests`}
              />
              <MetricCard
                testid="kpi-metric-sql-execution"
                label="SQL EXECUTION"
                value={fmtDuration(data.sql.avg)}
                unit="AVERAGE"
                icon={Database}
                tone="neutral"
                hint={`${fmtInt(data.sql.executions)} executions · P95 ${fmtDuration(data.sql.p95)}`}
              />
            </div>

            {/* ----------------------- request performance --------------------- */}
            <Panel
              testid="panel-request-performance"
              title="Request performance"
              description="End-to-end AI request latency"
            >
              {data.availability.latencySeries && data.series.length > 0 ? (
                <LatencyChart data={data.series} />
              ) : (
                <div className="space-y-5">
                  <Unavailable
                    testid="latency-series-unavailable"
                    icon={LineChart}
                    title="Historical latency series unavailable from this telemetry source"
                    explanation="The observability endpoint reports aggregate percentiles rather than time-bucketed samples, so there is no trend to plot."
                    availableInstead="Aggregate latency statistics for the same traffic are available below."
                    compact
                  />
                  <StatList
                    testid="latency-aggregates"
                    columns={4}
                    items={[
                      { label: "AI average", value: fmtSeconds(data.latency.avg) },
                      { label: "AI P50", value: fmtSeconds(data.latency.p50), tone: "muted" },
                      { label: "AI P95", value: fmtSeconds(data.latency.p95), tone: "accent" },
                      { label: "AI max", value: fmtSeconds(data.latency.max), tone: "muted" },
                    ]}
                  />
                </div>
              )}
            </Panel>

            {/* -------------------- pipeline + stage ranking ------------------- */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <Panel
                testid="panel-pipeline-performance"
                title="Pipeline performance"
                description="Where AI request time is spent, by group"
                className="xl:col-span-7"
                action={
                  <Link to="/pipeline" className={drillLink} data-testid="link-pipeline-explorer">
                    Explore pipeline <ArrowUpRight className="size-3" />
                  </Link>
                }
              >
                <PipelineGroupChart groups={data.pipeline} />
              </Panel>

              <Panel
                testid="panel-top-stages"
                title="Top stage breakdown"
                description="Highest average latency stages"
                className="xl:col-span-5"
                action={
                  <Link to="/pipeline" className={drillLink} data-testid="link-all-stages">
                    All stages <ArrowUpRight className="size-3" />
                  </Link>
                }
              >
                <TopStages stages={ranked} allStages={data.stages} />
              </Panel>
            </div>

            {/* ------------------------- SQL + endpoints ----------------------- */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <Panel
                testid="panel-sql-summary"
                title="SQL execution"
                description="Query execution health"
                className="xl:col-span-5"
                action={
                  <Link to="/sql" className={drillLink} data-testid="link-sql-execution">
                    SQL detail <ArrowUpRight className="size-3" />
                  </Link>
                }
              >
                <StatList
                  columns={2}
                  testid="sql-summary-stats"
                  items={[
                    { label: "Executions", value: fmtInt(data.sql.executions) },
                    {
                      label: "Success rate",
                      value: fmtPercentSmart(data.sql.successRate),
                      tone: data.sql.successRate === 100 ? "positive" : "warning",
                    },
                    { label: "Average", value: fmtDuration(data.sql.avg) },
                    { label: "P95", value: fmtDuration(data.sql.p95), tone: "accent" },
                    {
                      label: "Failed",
                      value: fmtInt(data.sql.failed),
                      tone: (data.sql.failed ?? 0) > 0 ? "negative" : "muted",
                    },
                    {
                      label: "Empty results",
                      value: fmtInt(data.sql.emptyResults),
                      tone: "muted",
                      hint: data.sql.emptyResultRate === null ? undefined : `${fmtPercentSmart(data.sql.emptyResultRate)} of executions`,
                    },
                  ]}
                />
              </Panel>

              <Panel
                testid="panel-endpoint-summary"
                title="Endpoint health"
                description="Busiest routes, AI workload first"
                className="xl:col-span-7"
                flush
                action={
                  <Link to="/endpoints" className={drillLink} data-testid="link-http-endpoints">
                    All endpoints <ArrowUpRight className="size-3" />
                  </Link>
                }
              >
                <EndpointTable rows={data.endpoints} limit={3} />
              </Panel>
            </div>

            {/* --------------------------- LLM usage --------------------------- */}
            <Panel
              testid="panel-llm-summary"
              title="LLM provider usage & cost"
              description="Token consumption and estimated engineering spend"
              action={
                <Link to="/llm" className={drillLink} data-testid="link-llm-usage">
                  LLM detail <ArrowUpRight className="size-3" />
                </Link>
              }
            >
              {data.llm && data.availability.llmUsage ? (
                <div className="space-y-5" data-testid="llm-overview-summary">
                  <StatList
                    columns={4}
                    testid="llm-overview-stats"
                    items={[
                      {
                        label: "LLM calls",
                        value: fmtInt(data.llm.calls),
                        hint: `${fmtInt(data.llm.failed)} failed`,
                      },
                      {
                        label: "Total tokens",
                        value: fmtTokens(data.llm.totalTokens),
                        tone: "accent",
                        hint: `${fmtTokens(data.llm.inputTokens)} in · ${fmtTokens(data.llm.outputTokens)} out`,
                      },
                      {
                        label: "Estimated cost",
                        value: fmtCost(data.llm.estimatedCost),
                        tone: "warning",
                        hint: "engineering estimate, not billing",
                      },
                      {
                        label: "LLM P95",
                        value: fmtDuration(data.llm.latency.p95),
                        tone: "accent",
                        hint: `${fmtDuration(data.llm.latency.avg)} average`,
                      },
                    ]}
                  />
                  {topLlmCost && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#1A1F2C] pt-4 text-[12px] text-[#8A94A8]">
                      Highest spend provider:
                      <span className="text-[#E2E8F0]">{topLlmCost.name}</span>
                      <span className="font-mono text-[#FCD34D]">
                        {fmtCost(topLlmCost.estimatedCost)}
                      </span>
                      {topLlmCost.costShare !== null && (
                        <span className="font-mono text-[11px] text-[#6E7A94]">
                          ({topLlmCost.costShare.toFixed(1)}% of LLM cost)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Unavailable
                  testid="llm-overview-unavailable"
                  icon={Sparkles}
                  title="LLM usage not reported by this telemetry source"
                  explanation="The observability response contains no llm object, so call counts, token totals and cost estimates are not shown."
                  compact
                />
              )}
            </Panel>
          </>
        );
      }}
    </TelemetryPage>
  );
}
