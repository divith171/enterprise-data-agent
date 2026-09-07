import { Activity, Gauge, ServerCog, TriangleAlert } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import MetricCard from "@/components/observability/MetricCard";
import Panel from "@/components/observability/Panel";
import StatList from "@/components/observability/StatList";
import EndpointTable from "@/components/observability/EndpointTable";
import { fmtDuration, fmtInt, fmtPercentSmart, fmtSeconds } from "@/lib/format";

export default function HttpEndpoints() {
  return (
    <TelemetryPage title="HTTP Endpoints" subtitle="Per-route traffic, success and latency">
      {(data) => {
        const totalRequests = data.endpoints.reduce((a, e) => a + (e.requests ?? 0), 0);
        const totalFailures = data.endpoints.reduce((a, e) => a + (e.failures ?? 0), 0);
        const primary = data.endpoints.find((e) => e.primary);
        const slowest = [...data.endpoints]
          .filter((e) => e.p95 !== null)
          .sort((a, b) => (b.p95 ?? 0) - (a.p95 ?? 0))[0];

        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                testid="kpi-endpoint-count"
                label="TRACKED ENDPOINTS"
                value={fmtInt(data.endpoints.length)}
                icon={ServerCog}
                hint={`${fmtInt(totalRequests)} requests across all routes`}
              />
              <MetricCard
                testid="kpi-endpoint-failures"
                label="TOTAL FAILURES"
                value={fmtInt(totalFailures)}
                icon={TriangleAlert}
                tone={totalFailures > 0 ? "negative" : "neutral"}
                hint="summed across every tracked route"
              />
              <MetricCard
                testid="kpi-endpoint-primary"
                label="PRIMARY AI ROUTE"
                value={primary ? fmtPercentSmart(primary.successRate) : "—"}
                unit="SUCCESS"
                icon={Activity}
                tone={primary?.successRate === 100 ? "positive" : "warning"}
                hint={primary ? `${primary.path} · ${fmtInt(primary.requests)} requests` : "no /query traffic"}
              />
              <MetricCard
                testid="kpi-endpoint-slowest"
                label="SLOWEST ROUTE P95"
                value={slowest ? fmtDuration(slowest.p95) : "—"}
                unit="P95"
                icon={Gauge}
                tone="accent"
                hint={slowest ? slowest.path : "no latency reported"}
              />
            </div>

            <Panel
              testid="panel-http-latency"
              title="All HTTP traffic"
              description="Aggregate across every route, including non-AI endpoints"
            >
              <StatList
                columns={4}
                testid="http-aggregate-stats"
                items={[
                  { label: "Average", value: fmtSeconds(data.httpLatency.avg) },
                  { label: "P50", value: fmtSeconds(data.httpLatency.p50), tone: "muted" },
                  { label: "P95", value: fmtSeconds(data.httpLatency.p95), tone: "accent" },
                  { label: "Max", value: fmtSeconds(data.httpLatency.max), tone: "muted" },
                ]}
              />
            </Panel>

            <Panel
              testid="panel-endpoint-health"
              title="Endpoint health"
              description="Click any column header to sort · the AI workload route stays highlighted"
              flush
            >
              <EndpointTable rows={data.endpoints} sortable />
            </Panel>
          </>
        );
      }}
    </TelemetryPage>
  );
}
