import { ListTree, Plug } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import Panel from "@/components/observability/Panel";
import StatList from "@/components/observability/StatList";
import TraceViewerModal from "@/components/observability/TraceViewerModal";
import { Unavailable } from "@/components/observability/States";
import { fmtDuration, fmtInt, fmtSeconds } from "@/lib/format";
import { useState } from "react";
import type { RequestTrace } from "@/lib/telemetry/types";
import TraceTable from "@/components/observability/TraceTable";

/**
 * Request-level traces are not exposed by the current telemetry source. The page is
 * built so a future traces API only has to populate `data.traces` and flip
 * `availability.requestTraces` — no redesign, no fake route.
 */
export default function RequestTraces() {
  const [selected, setSelected] = useState<RequestTrace | null>(null);

  return (
    <TelemetryPage
      title="Request Traces"
      subtitle="Per-request timelines, attempts and generated SQL"
    >
      {(data) => {
        const hasTraces = data.availability.requestTraces && data.traces.length > 0;

        return (
          <>
            {hasTraces ? (
              <Panel
                testid="panel-request-traces"
                title="Recent requests"
                description="Select a request to inspect its pipeline waterfall and SQL"
                flush
              >
                <TraceTable traces={data.traces} onSelect={setSelected} />
              </Panel>
            ) : (
              <>
                <Unavailable
                  testid="traces-unavailable"
                  icon={ListTree}
                  title="No request-level traces are exposed by the current telemetry source"
                  explanation="The observability endpoint reports aggregate counters and percentiles for the whole system. Individual request records — question text, request ids, per-request SQL and span waterfalls — are not part of that response, so none are shown."
                  availableInstead="Aggregate observability is fully available: request totals, latency percentiles, pipeline stage timings, SQL execution health, retries and endpoint health."
                />

                <Panel
                  testid="panel-aggregate-instead"
                  title="What is available instead"
                  description="System-wide figures covering the same traffic these traces would describe"
                >
                  <StatList
                    columns={4}
                    testid="traces-aggregate-stats"
                    items={[
                      { label: "AI requests", value: fmtInt(data.requests.total) },
                      {
                        label: "Successful",
                        value: fmtInt(data.requests.successful),
                        tone: "positive",
                      },
                      {
                        label: "Failed",
                        value: fmtInt(data.requests.failed),
                        tone: (data.requests.failed ?? 0) > 0 ? "negative" : "muted",
                      },
                      {
                        label: "Retried",
                        value: fmtInt(data.requests.retried),
                        tone: (data.requests.retried ?? 0) > 0 ? "warning" : "muted",
                      },
                      { label: "Average latency", value: fmtSeconds(data.latency.avg) },
                      { label: "P50 latency", value: fmtSeconds(data.latency.p50), tone: "muted" },
                      { label: "P95 latency", value: fmtSeconds(data.latency.p95), tone: "accent" },
                      { label: "Average SQL", value: fmtDuration(data.sql.avg), tone: "muted" },
                    ]}
                  />
                </Panel>

                <div
                  className="flex items-start gap-3 rounded-xl border border-[#1E2433] bg-[#0E111A] px-5 py-4"
                  data-testid="traces-future-note"
                >
                  <Plug className="mt-[2px] size-4 shrink-0 text-[#5D6880]" strokeWidth={1.8} />
                  <p className="text-[12.5px] leading-relaxed text-[#7C8698]">
                    This screen is wired to the normalized telemetry model. When a
                    request-traces API becomes available, the telemetry mapper populates{" "}
                    <span className="font-mono text-[#8A94A8]">traces</span> and sets{" "}
                    <span className="font-mono text-[#8A94A8]">availability.requestTraces</span> —
                    the table and trace inspector below render with no page redesign.
                  </p>
                </div>
              </>
            )}

            <TraceViewerModal trace={selected} onClose={() => setSelected(null)} />
          </>
        );
      }}
    </TelemetryPage>
  );
}
