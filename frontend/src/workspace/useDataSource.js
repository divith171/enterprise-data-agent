import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { evaluateSources, pickSources } from "@/lib/queryContract";

// Holds only id, name, is_active, type. Topology fields are never kept.
export function useDataSource(identity, onAuthLost) {
  const [state, setState] = useState({ status: "loading", source: null, revalidating: false, retryTarget: null });
  const lostRef = useRef(onAuthLost);
  lostRef.current = onAuthLost;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading", source: null, revalidating: false, retryTarget: null });
    let next = { status: "error", source: null };
    try {
      const r = await api.listDataSources();
      if (r.status === 401) return lostRef.current();
      if (r.status === 200) next = evaluateSources(r.body);
    } catch {
      // transport failure → error state with Retry
    }
    if (alive.current) setState({ ...next, revalidating: false, retryTarget: null });
  }, []);

  const revalidate = useCallback(
    async (sourceId) => {
      setState((s) => ({ ...s, revalidating: true }));
      try {
        const me = await api.me();
        if (me.status === 401 || (me.status === 200 && (me.body?.id !== identity.id || me.body?.company_id !== identity.company_id))) {
          return lostRef.current();
        }
        if (me.status !== 200) throw new Error("me");
        const r = await api.listDataSources();
        if (r.status === 401) return lostRef.current();
        if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("sources");
        const match = pickSources(r.body).find((s) => s.id === sourceId && s.is_active === true);
        if (!alive.current) return;
        setState({ status: match ? "ready" : "unavailable", source: match || null, revalidating: false, retryTarget: null });
      } catch {
        if (alive.current) setState({ status: "error", source: null, revalidating: false, retryTarget: sourceId });
      }
    },
    [identity],
  );

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(() => (state.retryTarget !== null ? revalidate(state.retryTarget) : load()), [state.retryTarget, revalidate, load]);

  return { ...state, load, revalidate, retry };
}
