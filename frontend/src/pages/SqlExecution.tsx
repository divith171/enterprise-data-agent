import { FileSearch } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import MetricCard from "@/components/observability/MetricCard";
import Panel from "@/components/observability/Panel";
import StatList from "@/components/observability/StatList";
import { Unavailable } from "@/components/observability/States";
import { Database, Rows3, TimerReset, XCircle } from "lucide-react";
import { fmtDuration, fmtInt, fmtPercentSmart } from "@/lib/format";

export default function SqlExecution() {
  return (
    <TelemetryPage
      title="SQL Execution"
      subtitle="Query execution performance and result health"
    >
      {(data) => {
        const sql = data.sql;
        const maxBar = Math.max(sql.avg ?? 0, sql.p50 ?? 0, sql.p95 ?? 0, sql.max ?? 0, 0.001);
        const bars = [
          { label: "Average", value: sql.avg, color: "#34D399" },
          { label: "P50", value: sql.p50, color: "#38BDF8" },
          { label: "P95", value: sql.p95, color: "#818CF8" },
          { label: "Max", value: sql.max, color: "#F43F5E" },
        ];

        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                testid="kpi-sql-executions"
                label="TOTAL EXECUTIONS"
                value={fmtInt(sql.executions)}
                icon={Database}
                hint={`${fmtInt(sql.successful)} successful · ${fmtInt(sql.failed)} failed`}
              />
              <MetricCard
                testid="kpi-sql-success-rate"
                label="SUCCESS RATE"
                value={fmtPercentSmart(sql.successRate)}
                icon={XCircle}
                tone={sql.successRate === 100 ? "positive" : "negative"}
                hint={`${fmtInt(sql.failed)} failed executions`}
              />
              <MetricCard
                testid="kpi-sql-average"
                label="AVERAGE EXECUTION"
                value={fmtDuration(sql.avg)}
                unit="AVERAGE"
                icon={TimerReset}
                tone="accent"
                hint={`P95 ${fmtDuration(sql.p95)} · max ${fmtDuration(sql.max)}`}
              />
              <MetricCard
                testid="kpi-sql-rows"
                label="ROWS RETURNED"
                value={fmtInt(sql.avgRows)}
                unit="AVERAGE"
                icon={Rows3}
                hint={`${fmtInt(sql.emptyResults)} empty result sets`}
              />
            </div>

            <Panel
              testid="panel-sql-latency"
              title="Execution time distribution"
              description="Reported percentiles for SQL execution"
            >
              <ul className="space-y-3.5" data-testid="sql-latency-bars">
                {bars.map((b) => (
                  <li key={b.label} className="flex items-center gap-4">
                    <span className="w-[64px] shrink-0 text-[12px] text-[#8A94A8]">{b.label}</span>
                    <div className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#161B27]">
                      <div
                        className="animate-bar-grow h-full origin-left rounded-full"
                        style={{
                          width: b.value === null ? "0%" : `${Math.max(2, ((b.value ?? 0) / maxBar) * 100)}%`,
                          background: `linear-gradient(90deg, ${b.color}59 0%, ${b.color} 100%)`,
                        }}
                      />
                    </div>
                    <span className="w-[76px] shrink-0 text-right font-mono text-[12.5px] text-[#F1F5F9]">
                      {fmtDuration(b.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <Panel
                testid="panel-sql-aggregate"
                title="Execution summary"
                description="Every SQL metric reported by this source"
                className="xl:col-span-7"
              >
                <StatList
                  columns={3}
                  testid="sql-aggregate-stats"
                  items={[
                    { label: "Total executions", value: fmtInt(sql.executions) },
                    { label: "Successful", value: fmtInt(sql.successful), tone: "positive" },
                    {
                      label: "Failed",
                      value: fmtInt(sql.failed),
                      tone: (sql.failed ?? 0) > 0 ? "negative" : "muted",
                    },
                    { label: "Success rate", value: fmtPercentSmart(sql.successRate) },
                    { label: "Average time", value: fmtDuration(sql.avg) },
                    { label: "P50 time", value: fmtDuration(sql.p50), tone: "muted" },
                    { label: "P95 time", value: fmtDuration(sql.p95), tone: "accent" },
                    { label: "Max time", value: fmtDuration(sql.max), tone: "muted" },
                    { label: "Average rows", value: fmtInt(sql.avgRows) },
                    { label: "P50 rows", value: fmtInt(sql.p50Rows), tone: "muted" },
                    { label: "Max rows", value: fmtInt(sql.maxRows), tone: "muted" },
                    {
                      label: "Empty results",
                      value: fmtInt(sql.emptyResults),
                      tone: (sql.emptyResults ?? 0) > 0 ? "warning" : "muted",
                      hint:
                        sql.emptyResultRate === null
                          ? undefined
                          : `${fmtPercentSmart(sql.emptyResultRate)} of executions`,
                    },
                  ]}
                />
              </Panel>

              <div className="xl:col-span-5">
                <Unavailable
                  testid="sql-query-level-unavailable"
                  icon={FileSearch}
                  title="Query-level history not exposed"
                  explanation="This telemetry source aggregates SQL execution metrics. Individual statements, their text and per-query timings are not part of the response, so no query list is shown."
                  availableInstead="Aggregate SQL health is complete on this page."
                />
              </div>
            </div>
          </>
        );
      }}
    </TelemetryPage>
  );
}
