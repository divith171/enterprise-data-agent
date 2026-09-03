import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { overviewQueryKey } from "./source";
import { useOverview } from "./useTelemetry";
import type { TimeRange } from "./types";

/**
 * One wiring for every screen: range state, the shared query, and a refresh that
 * invalidates the active key. Components never fetch telemetry themselves.
 */
export function usePageTelemetry(initialRange: TimeRange = "24h") {
  const [range, setRange] = useState<TimeRange>(initialRange);
  const queryClient = useQueryClient();
  const query = useOverview(range);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: overviewQueryKey(range) });
  };

  return { range, setRange, refresh, ...query };
}
