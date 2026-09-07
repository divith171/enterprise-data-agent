import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDateTime, fmtDuration, fmtInt, fmtMillis } from "@/lib/format";
import type { RequestTrace } from "@/lib/telemetry/types";

const GROUP_COLOR: Record<string, string> = {
  Understanding: "#38BDF8",
  Retrieval: "#34D399",
  Planning: "#818CF8",
  Validation: "#A78BFA",
  Generation: "#FBBF24",
  Execution: "#F472B6",
};

interface Props {
  trace: RequestTrace | null;
  onClose: () => void;
}

export default function TraceViewerModal({ trace, onClose }: Props) {
  const total = trace ? Math.max(1, trace.totalSeconds * 1000) : 1;

  return (
    <Dialog open={trace !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[86vh] overflow-y-auto border-[#252D3E] bg-[#0F131D] sm:max-w-3xl"
        data-testid="trace-viewer-modal"
      >
        {trace && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[15px] text-[#F1F5F9]">{trace.question}</DialogTitle>
              <DialogDescription className="font-mono text-[11.5px] text-[#6E7A94]">
                {trace.id} · {fmtDateTime(trace.startedAt)} · {fmtDuration(trace.totalSeconds)} total
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "TOTAL", value: fmtDuration(trace.totalSeconds) },
                { label: "SQL EXECUTION", value: fmtDuration(trace.sqlSeconds) },
                { label: "ROWS RETURNED", value: fmtInt(trace.rows) },
                { label: "RETRIES", value: fmtInt(trace.retries) },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-[#1E2433] bg-[#11141E] px-3 py-2.5">
                  <div className="text-[9px] font-semibold tracking-[0.1em] text-[#4C566E]">{m.label}</div>
                  <div className="mt-1.5 font-mono text-[13px] text-[#E9EDF5]">{m.value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2.5 text-[11px] font-semibold tracking-[0.1em] text-[#4C566E]">
                LATENCY WATERFALL
              </div>
              <ul className="space-y-1" data-testid="trace-waterfall">
                {trace.spans.map((span) => {
                  const color = GROUP_COLOR[span.group] ?? "#64748B";
                  return (
                    <li key={`${span.name}-${span.startMs}`} className="flex items-center gap-3">
                      <span className="w-[150px] shrink-0 truncate text-[11.5px] text-[#A7B0C2]">
                        {span.name}
                      </span>
                      <div className="relative h-[8px] min-w-0 flex-1 rounded-full bg-[#141824]">
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            left: `${(span.startMs / total) * 100}%`,
                            width: `${Math.max(1, (span.durationMs / total) * 100)}%`,
                            background: color,
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <span className="w-[64px] shrink-0 text-right font-mono text-[11px] text-[#8A94A8]">
                        {fmtMillis(span.durationMs)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <div className="mb-2.5 text-[11px] font-semibold tracking-[0.1em] text-[#4C566E]">
                GENERATED SQL
              </div>
              <pre
                className="overflow-x-auto rounded-lg border border-[#1E2433] bg-[#0D1017] px-4 py-3.5 font-mono text-[12px] leading-relaxed text-[#C7D2FE]"
                data-testid="trace-sql"
              >
                {trace.sql}
              </pre>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
