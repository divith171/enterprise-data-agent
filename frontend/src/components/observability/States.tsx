import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@/lib/telemetry/types";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#181D2B]", className)} />;
}

export function StatusBanner({ status, summary }: { status: SystemStatus; summary: string }) {
  const map = {
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
  }[status];

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

export function OverviewSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 xl:px-8" data-testid="overview-skeleton">
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px]" />
        ))}
      </div>
      <Skeleton className="h-[372px] w-full" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Skeleton className="h-[280px] xl:col-span-7" />
        <Skeleton className="h-[280px] xl:col-span-5" />
      </div>
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div
      className="mx-6 my-6 rounded-xl border border-[#4C2126] bg-[#1A0F12] px-6 py-10 text-center xl:mx-8"
      data-testid="telemetry-error-state"
    >
      <AlertTriangle className="mx-auto size-6 text-[#F87171]" strokeWidth={1.8} />
      <h3 className="mt-3 text-[15px] font-semibold text-[#F1F5F9]">Telemetry unavailable</h3>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-[#8A94A8]">
        {message ??
          "GET /api/observability/overview did not return telemetry. No metrics are shown rather than stale or mock values."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="btn-retry-telemetry"
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#4C2126] bg-[#2A1215] px-3.5 py-2 text-[12px] text-[#FCA5A5] transition-colors hover:bg-[#341418] active:scale-[0.98]"
      >
        <RefreshCw className="size-3.5" strokeWidth={2} />
        Try again
      </button>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-5 py-12 text-center" data-testid="empty-state">
      <CheckCircle2 className="mx-auto size-5 text-[#3D4658]" strokeWidth={1.7} />
      <div className="mt-3 text-[13px] text-[#8A94A8]">{title}</div>
      {hint && <div className="mt-1 text-[12px] text-[#5D6880]">{hint}</div>}
    </div>
  );
}
