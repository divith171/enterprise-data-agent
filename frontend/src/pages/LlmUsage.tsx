import { useState } from "react";
import { BadgeDollarSign, Boxes, Coins, Cpu, Layers, Sparkles, Timer } from "lucide-react";
import TelemetryPage from "@/components/layout/TelemetryPage";
import MetricCard from "@/components/observability/MetricCard";
import Panel from "@/components/observability/Panel";
import StatList from "@/components/observability/StatList";
import LlmBreakdownTable from "@/components/observability/LlmBreakdownTable";
import { Unavailable } from "@/components/observability/States";
import { cn } from "@/lib/utils";
import { fmtCost, fmtDuration, fmtInt, fmtPercentSmart, fmtTokens } from "@/lib/format";
import type { LlmBreakdown } from "@/lib/telemetry/types";

type Tab = "provider" | "model" | "layer";

const TABS: { id: Tab; label: string; testid: string }[] = [
  { id: "provider", label: "By provider", testid: "llm-tab-provider" },
  { id: "model", label: "By model", testid: "llm-tab-model" },
  { id: "layer", label: "By layer", testid: "llm-tab-layer" },
];

export default function LlmUsage() {
  const [tab, setTab] = useState<Tab>("provider");

  return (
    <TelemetryPage
      title="LLM Usage & Cost"
      subtitle="Provider, model and layer token consumption with estimated spend"
    >
      {(data) => {
        const llm = data.llm;

        if (!llm || !data.availability.llmUsage) {
          return (
            <Unavailable
              testid="llm-unavailable"
              icon={Sparkles}
              title="LLM usage and cost are not reported by this telemetry source"
              explanation="The observability response contains no llm object, so no call counts, token totals or cost estimates are shown. Nothing is inferred or simulated in their place."
              availableInstead="Pipeline stage timings, SQL execution health and request latency remain fully available on the other screens."
            />
          );
        }

        const rows: Record<Tab, LlmBreakdown[]> = {
          provider: llm.byProvider,
          model: llm.byModel,
          layer: llm.byLayer,
        };
        const active = rows[tab];
        const topCost = [...active].sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0))[0];
        const outputShare =
          llm.totalTokens && llm.outputTokens !== null && llm.totalTokens > 0
            ? (llm.outputTokens / llm.totalTokens) * 100
            : null;

        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                testid="kpi-llm-calls"
                label="TOTAL LLM CALLS"
                value={fmtInt(llm.calls)}
                icon={Cpu}
                tone={(llm.failed ?? 0) > 0 ? "warning" : "neutral"}
                hint={`${fmtInt(llm.successful)} successful · ${fmtInt(llm.failed)} failed`}
              />
              <MetricCard
                testid="kpi-llm-tokens"
                label="TOTAL TOKENS"
                value={fmtTokens(llm.totalTokens)}
                icon={Boxes}
                tone="accent"
                hint={`${fmtTokens(llm.inputTokens)} in · ${fmtTokens(llm.outputTokens)} out`}
              />
              <MetricCard
                testid="kpi-llm-cost"
                label="ESTIMATED COST"
                value={fmtCost(llm.estimatedCost)}
                unit="USD"
                icon={Coins}
                tone="warning"
                hint={
                  llm.calls && llm.estimatedCost !== null && llm.calls > 0
                    ? `${fmtCost(llm.estimatedCost / llm.calls)} per call`
                    : "cost per call not derivable"
                }
              />
              <MetricCard
                testid="kpi-llm-latency"
                label="LLM LATENCY"
                value={fmtDuration(llm.latency.p95)}
                unit="P95"
                icon={Timer}
                tone="accent"
                hint={`${fmtDuration(llm.latency.avg)} average · max ${fmtDuration(llm.latency.max)}`}
              />
            </div>

            <div
              className="flex items-start gap-3 rounded-xl border border-[#232A3B] bg-[#0E111A] px-5 py-3.5"
              data-testid="llm-cost-disclaimer"
            >
              <BadgeDollarSign className="mt-[1px] size-4 shrink-0 text-[#FBBF24]" strokeWidth={1.8} />
              <p className="text-[12.5px] leading-relaxed text-[#8A94A8]">
                Costs are <span className="font-medium text-[#D6DCE8]">engineering estimates</span>{" "}
                attributed from observed token usage — for finding which provider, model or pipeline
                layer is consuming budget. They are not billing figures and should not be reconciled
                against a provider invoice.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <Panel
                testid="panel-llm-aggregate"
                title="Usage summary"
                description="Every LLM metric reported by this source"
                className="xl:col-span-7"
              >
                <StatList
                  columns={3}
                  testid="llm-aggregate-stats"
                  items={[
                    { label: "Total calls", value: fmtInt(llm.calls) },
                    { label: "Successful", value: fmtInt(llm.successful), tone: "positive" },
                    {
                      label: "Failed",
                      value: fmtInt(llm.failed),
                      tone: (llm.failed ?? 0) > 0 ? "negative" : "muted",
                    },
                    { label: "Success rate", value: fmtPercentSmart(llm.successRate) },
                    { label: "Input tokens", value: fmtTokens(llm.inputTokens) },
                    { label: "Output tokens", value: fmtTokens(llm.outputTokens) },
                    { label: "Total tokens", value: fmtTokens(llm.totalTokens) },
                    {
                      label: "Output share",
                      value: outputShare === null ? "—" : fmtPercentSmart(outputShare),
                      tone: "muted",
                      hint: "output tokens usually cost more",
                    },
                    {
                      label: "Estimated cost",
                      value: fmtCost(llm.estimatedCost),
                      tone: "warning",
                    },
                    { label: "Average latency", value: fmtDuration(llm.latency.avg) },
                    { label: "P50 latency", value: fmtDuration(llm.latency.p50), tone: "muted" },
                    { label: "P95 latency", value: fmtDuration(llm.latency.p95), tone: "accent" },
                  ]}
                />
              </Panel>

              <Panel
                testid="panel-llm-cost-drivers"
                title="Cost drivers"
                description={`Highest spend ${tab === "model" ? "models" : tab === "layer" ? "layers" : "providers"}`}
                className="xl:col-span-5"
              >
                {active.length === 0 ? (
                  <div
                    className="py-10 text-center text-[13px] text-[#5D6880]"
                    data-testid="llm-cost-drivers-empty"
                  >
                    No breakdown reported for this dimension
                  </div>
                ) : (
                  <ul className="space-y-2.5" data-testid="llm-cost-drivers">
                    {[...active]
                      .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0))
                      .slice(0, 5)
                      .map((row) => (
                        <li
                          key={row.key}
                          data-testid={`llm-driver-${row.key}`}
                          className="rounded-lg border border-[#1A1F2C] bg-[#0F131D] px-3.5 py-3 transition-colors duration-200 hover:border-[#283044]"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span
                              className={cn(
                                "truncate text-[12.5px] text-[#E9EDF5]",
                                tab === "model" && "font-mono text-[12px]",
                              )}
                            >
                              {row.name}
                            </span>
                            <span className="shrink-0 font-mono text-[13px] text-[#FCD34D]">
                              {fmtCost(row.estimatedCost)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#161B27]">
                              <div
                                className="animate-bar-grow h-full origin-left rounded-full"
                                style={{
                                  width: `${Math.max(
                                    2,
                                    ((row.estimatedCost ?? 0) / (topCost?.estimatedCost || 1)) * 100,
                                  )}%`,
                                  background:
                                    "linear-gradient(90deg, rgba(251,191,36,0.35), #FBBF24)",
                                }}
                              />
                            </div>
                            <span className="shrink-0 font-mono text-[10.5px] text-[#6E7A94]">
                              {fmtInt(row.calls)} calls · {fmtTokens(row.totalTokens)} tok
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel
              testid="panel-llm-breakdown"
              title="Usage breakdown"
              description="Click any column header to sort · cost per call and per 1k tokens are derived"
              flush
              action={
                <div
                  className="flex items-center gap-0.5 rounded-md border border-[#232A3B] bg-[#0E111A] p-0.5"
                  data-testid="llm-breakdown-tabs"
                >
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      data-testid={t.testid}
                      aria-pressed={tab === t.id}
                      className={cn(
                        "rounded-[5px] px-2.5 py-[5px] text-[11.5px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none",
                        tab === t.id
                          ? "bg-[#1E2333] text-[#EEF2FF]"
                          : "text-[#6E7A94] hover:text-[#C3CAD8]",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              }
            >
              <LlmBreakdownTable
                key={tab}
                rows={active}
                monoNames={tab === "model"}
                testid={`llm-breakdown-${tab}`}
                emptyLabel={`No ${tab} breakdown reported by this telemetry source`}
              />
            </Panel>

            <Unavailable
              testid="llm-call-log-unavailable"
              icon={Layers}
              title="Individual LLM call records not exposed"
              explanation="This source aggregates LLM usage. Per-call prompts, completions, token counts and their originating request ids are not part of the response."
              availableInstead="Aggregate usage, cost attribution and latency percentiles above are live from the telemetry source."
              compact
            />
          </>
        );
      }}
    </TelemetryPage>
  );
}
