import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { evaluateSources } from "@/lib/queryContract";

const INITIAL_STATE = {
  status: "loading",
  source: null,
  sources: [],
  selectedSourceId: null,
  revalidating: false,
  retryTarget: null,
};

export function useDataSource(identity, onAuthLost) {
  const owner = JSON.stringify([identity.id, identity.company_id]);
  const ownerRef = useRef(owner);
  ownerRef.current = owner;

  const [ownedState, setOwnedState] = useState(() => ({
    owner,
    value: INITIAL_STATE,
  }));

  const stateRef = useRef(ownedState);
  const lostRef = useRef(onAuthLost);
  lostRef.current = onAuthLost;

  const aliveRef = useRef(false);
  const requestVersionRef = useRef(0);

  // Provides current state before React flushes a selection update.
  const getSnapshot = useCallback(() => {
    if (!aliveRef.current || stateRef.current.owner !== ownerRef.current) {
      return INITIAL_STATE;
    }

    return stateRef.current.value;
  }, []);

  const publish = useCallback((value, scope = ownerRef.current) => {
    const next = { owner: scope, value };
    stateRef.current = next;
    setOwnedState(next);
  }, []);

  const isCurrent = useCallback((version, scope) => {
    return (
      aliveRef.current &&
      version === requestVersionRef.current &&
      scope === ownerRef.current
    );
  }, []);

  const loseAuth = useCallback(
    (scope) => {
      requestVersionRef.current += 1;
      publish({ ...INITIAL_STATE, status: "error" }, scope);
      lostRef.current();
    },
    [publish],
  );

  const load = useCallback(async () => {
    if (!aliveRef.current) return;

    const scope = ownerRef.current;
    const version = ++requestVersionRef.current;
    const current = getSnapshot();
    const selectedSourceId = current.selectedSourceId;

    publish(
      {
        ...current,
        status: "loading",
        source: null,
        revalidating: false,
        retryTarget: null,
      },
      scope,
    );

    let next = {
      ...INITIAL_STATE,
      selectedSourceId,
      status: "error",
    };

    try {
      const response = await api.listDataSources();

      if (!isCurrent(version, scope)) return;
      if (response.status === 401) return loseAuth(scope);

      if (response.status === 200) {
        next = evaluateSources(response.body, selectedSourceId);
      }
    } catch {
      // Transport failure is represented by the existing error/Retry state.
    }

    if (isCurrent(version, scope)) {
      publish(
        {
          ...next,
          revalidating: false,
          retryTarget: null,
        },
        scope,
      );
    }
  }, [getSnapshot, isCurrent, loseAuth, publish]);

  const revalidate = useCallback(
    async (sourceId) => {
      if (
        !aliveRef.current ||
        sourceId === null ||
        sourceId === undefined ||
        sourceId !== getSnapshot().selectedSourceId
      ) {
        return;
      }

      const scope = ownerRef.current;
      const [expectedUserId, expectedCompanyId] = JSON.parse(scope);
      const version = ++requestVersionRef.current;

      publish({ ...getSnapshot(), revalidating: true }, scope);

      try {
        const me = await api.me();

        if (!isCurrent(version, scope)) return;

        if (
          me.status === 401 ||
          (me.status === 200 &&
            (me.body?.id !== expectedUserId ||
              me.body?.company_id !== expectedCompanyId))
        ) {
          return loseAuth(scope);
        }

        if (me.status !== 200) throw new Error("me");

        const response = await api.listDataSources();

        if (!isCurrent(version, scope)) return;
        if (response.status === 401) return loseAuth(scope);

        if (response.status !== 200 || !Array.isArray(response.body)) {
          throw new Error("sources");
        }

        publish(
          {
            ...evaluateSources(response.body, sourceId),
            revalidating: false,
            retryTarget: null,
          },
          scope,
        );
      } catch {
        if (isCurrent(version, scope)) {
          publish(
            {
              ...INITIAL_STATE,
              selectedSourceId: sourceId,
              status: "error",
              retryTarget: sourceId,
            },
            scope,
          );
        }
      }
    },
    [getSnapshot, isCurrent, loseAuth, publish],
  );

  // Internal selection primitive. Workspace orchestration must coordinate
  // confirmation and analytical-session changes before exposing this in UI.
  const selectSource = useCallback(
    (sourceId) => {
      const current = getSnapshot();

      if (
        !aliveRef.current ||
        current.revalidating ||
        ["loading", "error"].includes(current.status)
      ) {
        return null;
      }

      const source = current.sources.find((item) => item.id === sourceId);
      if (!source) return null;

      if (current.status === "ready" && current.source?.id === sourceId) {
        return current.source;
      }

      requestVersionRef.current += 1;

      publish({
        ...current,
        status: "ready",
        source,
        selectedSourceId: source.id,
        retryTarget: null,
      });

      return source;
    },
    [getSnapshot, publish],
  );

  useEffect(() => {
    aliveRef.current = true;
    load();

    return () => {
      aliveRef.current = false;
      requestVersionRef.current += 1;
    };
  }, [load, owner]);

  const retry = useCallback(() => {
    const { retryTarget } = getSnapshot();

    return retryTarget !== null
      ? revalidate(retryTarget)
      : load();
  }, [getSnapshot, load, revalidate]);

  const state =
    ownedState.owner === owner ? ownedState.value : INITIAL_STATE;

  return {
    ...state,
    load,
    revalidate,
    retry,
    getSnapshot,
    selectSource,
  };
}