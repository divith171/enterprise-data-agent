import { AlertOctagon, ScrollText, TriangleAlert } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import MetricCard from "@/components/observability/MetricCard";
import Panel from "@/components/observability/Panel";
import { HealthyState, Unavailable } from "@/components/observability/States";
import { fmtInt, fmtPercent, fmtPercentSmart } from "@/lib/format";
import { titleize } from "@/lib/format";

export default function AiErrors() {
  return (
    <TelemetryPage title="AI Errors" subtitle="Failure volume and error categories">
      {(data) => {
        const errors = data.errors;
        const hasErrors = (errors.total ?? 0) > 0;
        const maxCount = Math.max(...errors.types.map((t) => t.count), 1);

        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                testid="kpi-total-ai-errors"
                label="TOTAL AI ERRORS"
                value={fmtInt(errors.total)}
                icon={AlertOctagon}
                tone={hasErrors ? "negative" : "neutral"}
                hint={`out of ${fmtInt(data.requests.total)} AI requests`}
              />
              <MetricCard
                testid="kpi-ai-error-rate"
                label="ERROR RATE"
                value={fmtPercent(errors.rate ?? data.requests.failureRate)}
                icon={TriangleAlert}
                tone={hasErrors ? "negative" : "neutral"}
                hint={`${fmtInt(data.requests.successful)} successful requests`}
              />
              <MetricCard
                testid="kpi-ai-error-categories"
                label="ERROR CATEGORIES"
                value={fmtInt(errors.types.length)}
                icon={ScrollText}
                tone={errors.types.length > 0 ? "warning" : "neutral"}
                hint={
                  errors.types.length > 0
                    ? `most frequent: ${titleize(errors.types[0].name)}`
                    : "no error types reported"
                }
              />
            </div>

            <Panel
              testid="panel-error-types"
              title="Error categories"
              description="Aggregated AI error types reported by the telemetry source"
              flush={hasErrors && errors.types.length > 0}
            >
              {errors.types.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse" data-testid="error-types-table">
                    <thead>
                      <tr className="border-b border-[#1A1F2C]">
                        <th className="px-5 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                          ERROR TYPE
                        </th>
                        <th className="px-5 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                          DISTRIBUTION
                        </th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                          COUNT
                        </th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-semibold tracking-[0.1em] text-[#4C566E]">
                          SHARE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.types.map((t) => (
                        <tr
                          key={t.name}
                          data-testid={`error-type-${t.name}`}
                          className="border-b border-[#161A24] transition-colors last:border-b-0 hover:bg-[#141824]"
                        >
                          <td className="px-5 py-3">
                            <div className="text-[12.5px] text-[#E9EDF5]">{titleize(t.name)}</div>
                            <div className="mt-1 font-mono text-[10.5px] text-[#4C566E]">{t.name}</div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="h-[6px] w-[180px] overflow-hidden rounded-full bg-[#161B27]">
                              <div
                                className="animate-bar-grow h-full origin-left rounded-full"
                                style={{
                                  width: `${Math.max(3, (t.count / maxCount) * 100)}%`,
                                  background: "linear-gradient(90deg, rgba(244,63,94,0.35), #F43F5E)",
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[13px] text-[#FCA5A5]">
                            {fmtInt(t.count)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[12px] text-[#8A94A8]">
                            {fmtPercentSmart(t.share)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : hasErrors ? (
                <Unavailable
                  testid="error-types-unavailable"
                  icon={ScrollText}
                  title="Error type breakdown not reported"
                  explanation="Failures were counted, but this telemetry source did not return an error-type breakdown for them."
                  compact
                />
              ) : (
                <HealthyState
                  testid="no-ai-errors"
                  title="No AI errors recorded in the selected telemetry range"
                  detail={`All ${fmtInt(data.requests.total)} AI requests completed successfully. Error categories will appear here as soon as the telemetry source reports any.`}
                />
              )}
            </Panel>

            <Unavailable
              testid="error-records-unavailable"
              icon={ScrollText}
              title="Individual error records not exposed"
              explanation="This telemetry source reports error counts and categories only. Per-error records — timestamps, stack traces and the affected request ids — are not part of the response."
              availableInstead="Failure counts, error rate and category shares above are live from the telemetry source."
              compact
            />
          </>
        );
      }}
    </TelemetryPage>
  );
}
