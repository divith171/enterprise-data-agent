import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@/lib/telemetry/types";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-[#151926]", className)} />;
}

const STATUS_MAP = {
  healthy: {
    text: "SYSTEM HEALTHY",
    bg: "bg-[#06281E]",
    border: "border-[#0D533C]",
    fg: "text-[#6EE7B7]",
    dot: "bg-[#10B981]",
    glow: "shadow-[0_0_10px_rgba(16,185,129,0.9)]",
  },
  degraded: {
    text: "SYSTEM DEGRADED",
    bg: "bg-[#2A1E08]",
    border: "border-[#543C10]",
    fg: "text-[#FDE68A]",
    dot: "bg-[#F59E0B]",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.9)]",
  },
  unhealthy: {
    text: "SYSTEM UNHEALTHY",
    bg: "bg-[#2A1215]",
    border: "border-[#4C2126]",
    fg: "text-[#FCA5A5]",
    dot: "bg-[#EF4444]",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.9)]",
  },
} satisfies Record<SystemStatus, unknown>;

export function StatusBanner({ status, summary }: { status: SystemStatus; summary: string }) {
  const map = STATUS_MAP[status];
  return (
    <div
      data-testid="system-status-indicator"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3.5 py-2.5",
        map.bg,
        map.border,
      )}
    >
      <span className={cn("size-1.5 rounded-full", map.dot, map.glow)} />
      <span className={cn("text-[11px] font-semibold tracking-[0.1em]", map.fg)}>{map.text}</span>
      <span className="text-[12px] text-[#7C8698]">{summary}</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-7 px-6 py-7 xl:px-10" data-testid="page-skeleton">
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px]" />
        ))}
      </div>
      <Skeleton className="h-[260px] w-full" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Skeleton className="h-[300px] xl:col-span-7" />
        <Skeleton className="h-[300px] xl:col-span-5" />
      </div>
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="px-6 py-10 xl:px-10" data-testid="telemetry-error-state">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#3A1D22] bg-gradient-to-b from-[#170F12] to-[#0E1017] px-8 py-10 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-[#4C2126] bg-[#2A1215]">
          <CloudOff className="size-5 text-[#F87171]" strokeWidth={1.8} />
        </div>
        <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-[#F1F5F9]">
          Telemetry source unreachable
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#8A94A8]">
          {message ??
            "No response from the observability endpoint. Nothing is shown rather than stale or simulated values."}
        </p>
        <div className="mt-4 inline-block rounded-md border border-[#232A3B] bg-[#0D1017] px-3 py-1.5 font-mono text-[11.5px] text-[#7C8698]">
          GET /api/observability/overview
        </div>
        <div>
          <button
            type="button"
            onClick={onRetry}
            data-testid="btn-retry-telemetry"
            className="mt-6 inline-flex items-center gap-2 rounded-md border border-[#4C2126] bg-[#2A1215] px-4 py-2 text-[12.5px] text-[#FCA5A5] transition-[background-color,transform] hover:bg-[#341418] active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" strokeWidth={2} />
            Retry connection
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The single, intentional presentation for data this telemetry source does not expose.
 * Never a fallback to fabricated values.
 */
export function Unavailable({
  title,
  explanation,
  availableInstead,
  icon: Icon,
  testid,
  compact = false,
}: {
  title: string;
  explanation: string;
  availableInstead?: string;
  icon?: LucideIcon;
  testid: string;
  compact?: boolean;
}) {
  return (
    <div
      data-testid={testid}
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed border-[#242B3B] bg-[#0E111A] text-center",
        compact ? "px-6 py-8" : "px-8 py-14",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#6366F1]/[0.06] to-transparent"
      />
      {Icon && (
        <div className="relative mx-auto flex size-10 items-center justify-center rounded-xl border border-[#232A3B] bg-[#131723]">
          <Icon className="size-[18px] text-[#5D6880]" strokeWidth={1.7} />
        </div>
      )}
      <h4 className="relative mt-4 text-[14px] font-medium tracking-[-0.005em] text-[#C3CAD8]">
        {title}
      </h4>
      <p className="relative mx-auto mt-2 max-w-lg text-[12.5px] leading-relaxed text-[#6E7A94]">
        {explanation}
      </p>
      {availableInstead && (
        <p className="relative mx-auto mt-3 max-w-lg rounded-md border border-[#1E2433] bg-[#11141E] px-3 py-2 text-[12px] text-[#8A94A8]">
          {availableInstead}
        </p>
      )}
    </div>
  );
}

export function HealthyState({
  title,
  detail,
  testid,
}: {
  title: string;
  detail: string;
  testid: string;
}) {
  return (
    <div
      data-testid={testid}
      className="rounded-xl border border-[#0D533C]/60 bg-gradient-to-b from-[#06281E]/60 to-[#0D1017] px-8 py-12 text-center"
    >
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-[#0D533C] bg-[#06281E]">
        <CheckCircle2 className="size-[18px] text-[#34D399]" strokeWidth={1.8} />
      </div>
      <h4 className="mt-4 text-[14.5px] font-medium text-[#D9F2E6]">{title}</h4>
      <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-[#7FA394]">{detail}</p>
    </div>
  );
}

export function WarnState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[#543C10] bg-[#1A1408] px-6 py-8 text-center">
      <AlertTriangle className="mx-auto size-5 text-[#FBBF24]" strokeWidth={1.8} />
      <h4 className="mt-3 text-[14px] font-medium text-[#FDE68A]">{title}</h4>
      <p className="mx-auto mt-1.5 max-w-md text-[12.5px] text-[#B99A55]">{detail}</p>
    </div>
  );
}
