import { CheckCheck, Layers, Repeat2, TrendingUp } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import MetricCard from "@/components/observability/MetricCard";
import Panel from "@/components/observability/Panel";
import StatList from "@/components/observability/StatList";
import { HealthyState, Unavailable } from "@/components/observability/States";
import { fmtInt, fmtNumber, fmtPercentSmart } from "@/lib/format";

export default function RetriesAttempts() {
  return (
    <TelemetryPage
      title="Retries & Attempts"
      subtitle="How often the AI pipeline needs a second attempt"
    >
      {(data) => {
        const r = data.retries;
        const hasRetries = (r.requestsRetried ?? 0) > 0;
        const total = r.totalRequests ?? 0;
        const first = r.firstAttemptSuccesses ?? 0;
        const firstShare = total > 0 ? (first / total) * 100 : null;

        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                testid="kpi-retry-total-requests"
                label="TOTAL AI REQUESTS"
                value={fmtInt(r.totalRequests)}
                icon={Layers}
                hint={`${fmtInt(r.totalRetries)} retries issued in total`}
              />
              <MetricCard
                testid="kpi-first-attempt-successes"
                label="FIRST-ATTEMPT SUCCESS"
                value={fmtInt(r.firstAttemptSuccesses)}
                icon={CheckCheck}
                tone="positive"
                hint={firstShare === null ? "share not derivable" : `${fmtPercentSmart(firstShare)} of requests`}
              />
              <MetricCard
                testid="kpi-retry-rate"
                label="RETRY RATE"
                value={fmtPercentSmart(r.retryRate)}
                icon={Repeat2}
                tone={hasRetries ? "warning" : "neutral"}
                hint={`${fmtInt(r.requestsRetried)} requests retried`}
              />
              <MetricCard
                testid="kpi-average-attempts"
                label="AVERAGE ATTEMPTS"
                value={fmtNumber(r.averageAttempts)}
                icon={TrendingUp}
                tone={(r.averageAttempts ?? 1) > 1 ? "warning" : "neutral"}
                hint={`max ${fmtInt(r.maxAttempts)} attempt(s) observed`}
              />
            </div>

            <Panel
              testid="panel-attempt-summary"
              title="Attempt summary"
              description="Every retry metric reported by this telemetry source"
            >
              <StatList
                columns={4}
                testid="retry-stats"
                items={[
                  { label: "Total requests", value: fmtInt(r.totalRequests) },
                  {
                    label: "First-attempt successes",
                    value: fmtInt(r.firstAttemptSuccesses),
                    tone: "positive",
                  },
                  {
                    label: "Requests retried",
                    value: fmtInt(r.requestsRetried),
                    tone: hasRetries ? "warning" : "muted",
                  },
                  {
                    label: "Total retries",
                    value: fmtInt(r.totalRetries),
                    tone: hasRetries ? "warning" : "muted",
                  },
                  { label: "Retry rate", value: fmtPercentSmart(r.retryRate) },
                  { label: "Average attempts", value: fmtNumber(r.averageAttempts) },
                  { label: "Max attempts", value: fmtInt(r.maxAttempts), tone: "muted" },
                  {
                    label: "Failed after retry",
                    value: fmtInt(r.failedAfterRetry),
                    tone: (r.failedAfterRetry ?? 0) > 0 ? "negative" : "muted",
                  },
                ]}
              />
            </Panel>

            {hasRetries ? (
              <Panel
                testid="panel-attempt-distribution"
                title="Attempt outcome"
                description="Derived from the reported first-attempt and retry counts"
              >
                <ul className="space-y-3.5" data-testid="attempt-distribution">
                  {[
                    {
                      label: "Succeeded first attempt",
                      value: first,
                      color: "#34D399",
                    },
                    {
                      label: "Needed a retry",
                      value: r.requestsRetried ?? 0,
                      color: "#FBBF24",
                    },
                  ].map((row) => (
                    <li key={row.label} className="flex items-center gap-4">
                      <span className="w-[190px] shrink-0 text-[12px] text-[#8A94A8]">
                        {row.label}
                      </span>
                      <div className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#161B27]">
                        <div
                          className="animate-bar-grow h-full origin-left rounded-full"
                          style={{
                            width: total > 0 ? `${Math.max(2, (row.value / total) * 100)}%` : "0%",
                            background: `linear-gradient(90deg, ${row.color}59, ${row.color})`,
                          }}
                        />
                      </div>
                      <span className="w-[64px] shrink-0 text-right font-mono text-[12.5px] text-[#F1F5F9]">
                        {fmtInt(row.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : (
              <HealthyState
                testid="no-retries-state"
                title="No retries in the current telemetry"
                detail={`All ${fmtInt(r.firstAttemptSuccesses)} of ${fmtInt(r.totalRequests)} AI requests succeeded on the first attempt, averaging ${fmtNumber(r.averageAttempts)} attempt per request.`}
              />
            )}

            <Unavailable
              testid="attempt-histogram-unavailable"
              icon={Layers}
              title="Per-attempt history not exposed"
              explanation="This telemetry source reports retry counters rather than a per-attempt log, so a full attempt-by-attempt distribution and the reason each retry occurred are not available."
              availableInstead="Retry counters, average attempts and max attempts above are live from the telemetry source."
              compact
            />
          </>
        );
      }}
    </TelemetryPage>
  );
}
