import type { ReactNode } from "react";
import AppShell from "./AppShell";
import Header from "./Header";
import { ErrorState, PageSkeleton } from "@/components/observability/States";
import { usePageTelemetry } from "@/lib/telemetry/usePageTelemetry";
import type { ObservabilityOverview } from "@/lib/telemetry/types";

interface TelemetryPageProps {
  title: string;
  subtitle: string;
  /** Overview sets this to show the full source-limitation banner once, not on every page. */
  prominentDisclosure?: boolean;
  /** Rendered only once real telemetry is present. */
  children: (data: ObservabilityOverview) => ReactNode;
}

/**
 * Every screen shares this frame: shell, header (range/refresh/live status), polished
 * loading skeleton and a single error state. No screen renders fabricated values while
 * the source is unavailable.
 */
export default function TelemetryPage({
  title,
  subtitle,
  prominentDisclosure = false,
  children,
}: TelemetryPageProps) {
  const { range, setRange, refresh, data, isPending, isFetching, isError, refetch } =
    usePageTelemetry();

  const connected = isPending ? null : !isError && Boolean(data);

  return (
    <AppShell connected={connected}>
      <Header
        title={title}
        subtitle={subtitle}
        range={range}
        onRangeChange={setRange}
        lastUpdated={data?.generatedAt}
        isRefreshing={isFetching}
        onRefresh={refresh}
        connected={connected}
        rangeFiltered={data?.availability.rangeFiltered ?? false}
        prominentDisclosure={prominentDisclosure}
      />

      {isPending ? (
        <PageSkeleton />
      ) : isError || !data ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div
          className="animate-rise space-y-7 px-6 py-7 xl:px-10 xl:py-8"
          data-testid="page-content"
        >
          {children(data)}
        </div>
      )}
    </AppShell>
  );
}
