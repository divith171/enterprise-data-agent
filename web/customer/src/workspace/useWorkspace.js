import { useCallback, useEffect, useRef, useState } from "react";
import { api, previewBus } from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { useAnnounce } from "@/components/StatusRegion";
import { classifyResponse } from "@/lib/queryContract";
import { TransportError } from "@/api/transport";
import { newSessionId, uid, rowCountText } from "@/lib/session";
import { usePrefersReducedMotion } from "@/lib/useMediaQuery";
import { useDataSource } from "@/workspace/useDataSource";
import { DRAFT_LIMIT } from "@/components/workspace/QuestionComposer";
import { NOTICES } from "@/components/results/NoticeCard";
import { CANONICAL_QUESTION } from "@/workspace/previewQuestion";

const HOUR = 60 * 60 * 1000;

const announcementFor = (r) => {
  if (r.kind === "success") return `Result ready. ${rowCountText(r.rowCount)}.`;
  if (r.kind === "clarification") return "Clarification needed.";
  if (r.kind === "unsupported") return "Analysis not supported.";
  return NOTICES[r.kind].title;
};

function isVisibleIn(el, container) {
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const top = Math.max(0, c.top);
  const bottom = Math.min(window.innerHeight, c.bottom);
  return r.bottom > top && r.top < bottom;
}

export function useWorkspace() {
  const auth = useAuth();
  const { authLost, identity } = auth;
  const announce = useAnnounce();
  const reduced = usePrefersReducedMotion();
  const [initialRestore] = useState(() => auth.takeRestore());
  const [sessionId, setSessionId] = useState(newSessionId);
  const [turns, setTurns] = useState([]);
  const [draft, setDraftState] = useState(initialRestore || "");
  const [lastInserted, setLastInserted] = useState(null);
  const [pending, setPending] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState(Boolean(initialRestore));
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [retryUntil, setRetryUntil] = useState(0);
  const [newResultId, setNewResultId] = useState(null);
  const [confirm, setConfirmState] = useState(null);
  const [logoutError, setLogoutError] = useState(false);
  const [sourceChangeError, setSourceChangeError] = useState(null);

  const draftRef = useRef(draft);
  const confirmRef = useRef(null);
  const hasTurnsRef = useRef(false);
  const retryUntilRef = useRef(0);

  // The pair is authoritative even before React flushes a source-switch render.
  const analysisRef = useRef({ sessionId, dataSourceId: null });

  const inflightRef = useRef(null);
  const aliveRef = useRef(true);
  const composerRef = useRef(null);
  const convRef = useRef(null);
  const scrollTargetRef = useRef(null);

  const setDraft = useCallback((value) => {
    const text = typeof value === "function" ? value(draftRef.current) : value;
    draftRef.current = text;
    setDraftState(text);
  }, []);

  const setConfirm = useCallback((next) => {
    confirmRef.current = next;
    setConfirmState(next);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      announce("");
    };
  }, [announce]);

  const handleAuthLost = useCallback(() => {
    authLost(draftRef.current.trim() ? draftRef.current : inflightRef.current);
  }, [authLost]);

  const source = useDataSource(identity, handleAuthLost);
  const reloadSources = source.load;

  useEffect(() => {
    const t = setInterval(
      () => setNow(Date.now()),
      retryUntil > Date.now() ? 1000 : 30000,
    );
    return () => clearInterval(t);
  }, [retryUntil, now]);

  useEffect(() => {
    const target = scrollTargetRef.current;
    if (!target) return;
    scrollTargetRef.current = null;
    document.getElementById(target)?.scrollIntoView({
      block: "start",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [turns, reduced]);

  const focusComposer = () =>
    requestAnimationFrame(() => composerRef.current?.focus());

  const applyFill = useCallback(
    (text, kind) => {
      setDraft(text);
      setLastInserted(kind === "interpretation" ? text : null);
      requestAnimationFrame(() => composerRef.current?.focus(true));
    },
    [setDraft],
  );

  const fillDraft = useCallback(
    (text, kind) => {
      const cur = draftRef.current;
      const unedited =
        kind === "interpretation" &&
        lastInserted !== null &&
        cur === lastInserted;

      if (!cur.trim() || cur === text || unedited) {
        applyFill(text, kind);
      } else {
        setConfirm({ type: "replace", text, kind });
      }
    },
    [lastInserted, applyFill, setConfirm],
  );

  useEffect(() => {
    if (!previewBus) return undefined;

    const offs = [
      previewBus.on("inactivity", () => {
        setLastActivity(Date.now() - HOUR - 60000);
        setNow(Date.now());
      }),
      previewBus.on("reloadSources", () => reloadSources()),
      previewBus.on("canonicalQuestion", () =>
        fillDraft(CANONICAL_QUESTION, "question"),
      ),
    ];

    return () => offs.forEach((off) => off());
  }, [reloadSources, fillDraft]);

  const sourceReady = source.status === "ready" && !source.revalidating;
  const rateLimited = now < retryUntil;
  const canSend =
    sourceReady &&
    !pending &&
    !confirm &&
    !rateLimited &&
    draft.trim() !== "" &&
    draft.length <= DRAFT_LIMIT;

  const submit = async () => {
    const currentSource = source.getSnapshot();
    const text = draftRef.current;

    if (
      !aliveRef.current ||
      inflightRef.current !== null ||
      confirmRef.current ||
      currentSource.status !== "ready" ||
      currentSource.revalidating ||
      Date.now() < retryUntilRef.current ||
      !text.trim() ||
      text.length > DRAFT_LIMIT
    ) {
      return;
    }

    const sourceId = currentSource.source.id;

    if (analysisRef.current.dataSourceId === null) {
      analysisRef.current = {
        ...analysisRef.current,
        dataSourceId: sourceId,
      };
    }

    // Fail closed if a caller bypassed the coordinated source-change operation.
    if (analysisRef.current.dataSourceId !== sourceId) return;

    const binding = analysisRef.current;
    const id = uid();
    const sid = binding.sessionId;

    inflightRef.current = text;
    setPending(true);
    setNewResultId(null);
    setRestoreNotice(false);
    hasTurnsRef.current = true;

    setTurns((ts) => [
      ...ts,
      { id, question: text, startedAt: Date.now(), result: null },
    ]);

    setDraft("");
    setLastInserted(null);
    setLastActivity(Date.now());
    scrollTargetRef.current = `turn-${id}`;
    announce("Question sent.");

    let result;

    try {
      const res = await api.query({
        message: text,
        session_id: sid,
        data_source_id: sourceId,
      });

      if (!aliveRef.current || analysisRef.current !== binding) return;

      if (res.status === 401) {
        authLost(draftRef.current.trim() ? draftRef.current : text);
        return;
      }

      result = classifyResponse(res, { sessionId: sid, sourceId });
    } catch (e) {
      if (!aliveRef.current || analysisRef.current !== binding) return;
      result =
        e instanceof TransportError
          ? { kind: "network" }
          : { kind: "compat" };
    }

    const el = document.getElementById(`turn-${id}`);
    const visible =
      el && convRef.current ? isVisibleIn(el, convRef.current) : true;

    inflightRef.current = null;
    setPending(false);
    setLastActivity(Date.now());

    if (result.kind === "rateLimited" && result.retryAfter) {
      retryUntilRef.current = Date.now() + result.retryAfter * 1000;
      setRetryUntil(retryUntilRef.current);
      setNow(Date.now());
    }

    setTurns((ts) =>
      ts.map((t) => (t.id === id ? { ...t, result } : t)),
    );

    if (visible) {
      scrollTargetRef.current = `result-${id}`;
    } else {
      setNewResultId(id);
    }

    announce(announcementFor(result));

    if (result.kind === "forbidden") source.revalidate(sourceId);
  };

  const resetAnalysis = (
    dataSourceId = source.getSnapshot().selectedSourceId,
    nextSessionId = newSessionId(),
  ) => {
    analysisRef.current = {
      sessionId: nextSessionId,
      dataSourceId,
    };

    setSessionId(nextSessionId);
    hasTurnsRef.current = false;
    setTurns([]);
    setDraft("");
    setLastInserted(null);
    setNewResultId(null);
    setRestoreNotice(false);
    setSourceChangeError(null);
    scrollTargetRef.current = null;
    setLastActivity(Date.now());
    announce("New analysis started.");
    focusComposer();
  };

  const requestNewAnalysis = () => {
    if (!aliveRef.current || inflightRef.current !== null) return;

    if (hasTurnsRef.current || draftRef.current.trim()) {
      setConfirm({ type: "new" });
    } else {
      resetAnalysis();
    }
  };

  const commitSourceChange = (sourceId) => {
    const current = source.getSnapshot();

    if (
      !aliveRef.current ||
      inflightRef.current !== null ||
      current.revalidating ||
      ["loading", "error"].includes(current.status) ||
      sourceId === current.selectedSourceId
    ) {
      return false;
    }

    if (!current.sources.some((item) => item.id === sourceId)) {
      setSourceChangeError(
        "That data source is no longer available. Choose an available source.",
      );
      return false;
    }

    const initialSelection = current.selectedSourceId === null;

    if (
      initialSelection &&
      (analysisRef.current.dataSourceId !== null || hasTurnsRef.current)
    ) {
      setSourceChangeError(
        "This analysis cannot change sources without starting a new analysis.",
      );
      return false;
    }

    const nextSessionId = initialSelection
      ? analysisRef.current.sessionId
      : newSessionId();

    if (!source.selectSource(sourceId)) {
      setSourceChangeError(
        "That data source is no longer available. Choose an available source.",
      );
      return false;
    }

    if (initialSelection) {
      // Bind the existing UUID without clearing the draft or recovery notice.
      analysisRef.current = {
        sessionId: nextSessionId,
        dataSourceId: sourceId,
      };

      setSourceChangeError(null);
      announce("Data source selected.");
      focusComposer();
    } else {
      resetAnalysis(sourceId, nextSessionId);
    }

    return true;
  };

  const requestSourceChange = (sourceId) => {
    const current = source.getSnapshot();

    if (
      !aliveRef.current ||
      inflightRef.current !== null ||
      confirmRef.current ||
      current.revalidating ||
      ["loading", "error"].includes(current.status) ||
      sourceId === current.selectedSourceId
    ) {
      return false;
    }

    if (!current.sources.some((item) => item.id === sourceId)) return false;

    setSourceChangeError(null);

    if (
      current.selectedSourceId !== null &&
      (hasTurnsRef.current || draftRef.current.length > 0)
    ) {
      setConfirm({ type: "source", sourceId });
      return false;
    }

    return commitSourceChange(sourceId);
  };

  const confirmAction = () => {
    if (!aliveRef.current) return false;

    const next = confirmRef.current;
    if (!next) return false;

    // Replacing an editable draft remains allowed while a query is pending.
    if (next.type === "replace") {
      applyFill(next.text, next.kind);
      setConfirm(null);
      return true;
    }

    if (inflightRef.current !== null) return false;

    let changed = false;

    if (next.type === "new") {
      resetAnalysis();
      changed = true;
    } else if (next.type === "source") {
      changed = commitSourceChange(next.sourceId);
    }

    setConfirm(null);
    return changed;
  };

  const signOut = async () => {
    setLogoutError(false);
    const ok = await auth.signOut();
    if (!ok && aliveRef.current) setLogoutError(true);
  };

  const showNewResult = () => {
    document.getElementById(`result-${newResultId}`)?.scrollIntoView({
      block: "start",
      behavior: reduced ? "auto" : "smooth",
    });
    setNewResultId(null);
  };

  const lastTurn = turns[turns.length - 1];
  const composerLabel =
    lastTurn?.result?.kind === "clarification"
      ? "Clarification"
      : turns.length
        ? "Follow-up"
        : "Question";

  return {
    identity,
    source,
    sessionId,
    turns,
    draft,
    setDraft,
    pending,
    canSend,
    submit,
    fillDraft,
    composerRef,
    convRef,
    composerLabel,
    newResultId,
    showNewResult,
    restoreNotice,
    dismissRestore: () => setRestoreNotice(false),
    inactive: turns.length > 0 && !pending && now - lastActivity > HOUR,
    retrySeconds: rateLimited
      ? Math.ceil((retryUntil - now) / 1000)
      : 0,
    confirm,
    cancelConfirm: () => setConfirm(null),
    confirmAction,
    requestNewAnalysis,
    requestSourceChange,
    sourceChangeError,
    logoutError,
    dismissLogoutError: () => setLogoutError(false),
    signOut,
  };
}