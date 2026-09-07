import { BellOff, Eye, Radio, ShieldCheck } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import Panel from "@/components/observability/Panel";
import { HealthyState, Unavailable } from "@/components/observability/States";
import { cn } from "@/lib/utils";
import { MONITORED_RULES, detectedConditions, type ConditionSeverity } from "@/lib/telemetry/derive";

const SEVERITY: Record<ConditionSeverity, { label: string; chip: string; bar: string }> = {
  critical: {
    label: "CRITICAL",
    chip: "border-[#4C2126] bg-[#2A1215] text-[#FCA5A5]",
    bar: "bg-[#EF4444]",
  },
  warning: {
    label: "WARNING",
    chip: "border-[#543C10] bg-[#2A1E08] text-[#FDE68A]",
    bar: "bg-[#F59E0B]",
  },
  info: {
    label: "OBSERVATION",
    chip: "border-[#2E3757] bg-[#171B33] text-[#A5B4FC]",
    bar: "bg-[#6366F1]",
  },
  healthy: {
    label: "HEALTHY",
    chip: "border-[#0D533C] bg-[#06281E] text-[#6EE7B7]",
    bar: "bg-[#10B981]",
  },
};

export default function Alerts() {
  return (
    <TelemetryPage title="Alerts" subtitle="Operational conditions detected from live telemetry">
      {(data) => {
        const conditions = detectedConditions(data);

        return (
          <>
            <div
              className="flex items-start gap-3 rounded-xl border border-[#232A3B] bg-[#0E111A] px-5 py-4"
              data-testid="alerts-disclaimer"
            >
              <Eye className="mt-[2px] size-4 shrink-0 text-[#818CF8]" strokeWidth={1.8} />
              <div className="text-[12.5px] leading-relaxed text-[#8A94A8]">
                <span className="font-medium text-[#D6DCE8]">These are detected conditions</span>,
                evaluated in the browser from the live telemetry response — not configured alerts.
                No alert rules are stored and no notifications are dispatched anywhere. The current
                telemetry source does not expose alert records.
              </div>
            </div>

            <Panel
              testid="panel-detected-conditions"
              title="Detected conditions"
              description={
                conditions.length === 0
                  ? "Every monitored condition is currently healthy"
                  : `${conditions.length} condition${conditions.length === 1 ? "" : "s"} matched the current telemetry`
              }
            >
              {conditions.length === 0 ? (
                <HealthyState
                  testid="no-active-alerts"
                  title="No active alerts"
                  detail="All monitored conditions — failures, retries, SQL health, pipeline balance and latency — are within their thresholds for the current telemetry."
                />
              ) : (
                <ul className="space-y-2.5" data-testid="detected-conditions">
                  {conditions.map((c) => {
                    const s = SEVERITY[c.severity];
                    return (
                      <li
                        key={c.id}
                        data-testid={`condition-${c.id}`}
                        className="relative overflow-hidden rounded-lg border border-[#1E2433] bg-[#11141E] px-4 py-3.5 transition-colors duration-200 hover:border-[#2D3748]"
                      >
                        <span aria-hidden className={cn("absolute top-0 bottom-0 left-0 w-[2px]", s.bar)} />
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[13.5px] font-medium text-[#E9EDF5]">
                                {c.title}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-[2px] text-[9px] font-semibold tracking-[0.08em]",
                                  s.chip,
                                )}
                              >
                                {s.label}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[12px] text-[#7C8698]">{c.detail}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono text-[13px] text-[#F1F5F9]">{c.observed}</div>
                            <div className="mt-1 text-[10.5px] text-[#4C566E]">{c.rule}</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <Panel
                testid="panel-monitored-conditions"
                title="Monitored conditions"
                description="Evaluated on every telemetry refresh"
                className="xl:col-span-7"
              >
                <ul className="divide-y divide-[#161A24]" data-testid="monitored-rules">
                  {MONITORED_RULES.map((rule) => {
                    const active = detectedConditions(data).some((c) => c.rule === rule.rule);
                    return (
                      <li
                        key={rule.label}
                        className="flex items-center justify-between gap-4 py-2.5"
                        data-testid={`monitored-${rule.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        <div className="flex items-center gap-2.5">
                          {active ? (
                            <Radio className="size-3.5 text-[#FBBF24]" strokeWidth={2} />
                          ) : (
                            <ShieldCheck className="size-3.5 text-[#34D399]" strokeWidth={2} />
                          )}
                          <span className="text-[12.5px] text-[#D6DCE8]">{rule.label}</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#6E7A94]">{rule.rule}</span>
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              <div className="xl:col-span-5">
                <Unavailable
                  testid="configured-alerts-unavailable"
                  icon={BellOff}
                  title="No configured alerts"
                  explanation="Alert rules, delivery channels and alert history are not exposed by this telemetry source, so nothing is shown as a configured alert and no notification is claimed to have been sent."
                  availableInstead="The conditions above are evaluated live from real telemetry on every refresh."
                />
              </div>
            </div>
          </>
        );
      }}
    </TelemetryPage>
  );
}
