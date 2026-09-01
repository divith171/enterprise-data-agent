import { useQuery } from "@tanstack/react-query";
import { fetchOverview, overviewQueryKey } from "./source";
import type { TimeRange } from "./types";

/** The one read path for dashboard telemetry. Components never fetch directly. */
export function useOverview(range: TimeRange) {
  return useQuery({
    queryKey: overviewQueryKey(range),
    queryFn: () => fetchOverview(range),
    staleTime: 30_000,
    retry: false,
  });
}
