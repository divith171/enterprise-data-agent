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
  const [draft, setDraft] = useState(initialRestore || "");
  const [lastInserted, setLastInserted] = useState(null);
  const [pending, setPending] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState(Boolean(initialRestore));
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [retryUntil, setRetryUntil] = useState(0);
  const [newResultId, setNewResultId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [logoutError, setLogoutError] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const inflightRef = useRef(null);
  const aliveRef = useRef(true);
  const composerRef = useRef(null);
  const convRef = useRef(null);
  const scrollTargetRef = useRef(null);

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
    const t = setInterval(() => setNow(Date.now()), retryUntil > Date.now() ? 1000 : 30000);
    return () => clearInterval(t);
  }, [retryUntil, now]);

  useEffect(() => {
    const target = scrollTargetRef.current;
    if (!target) return;
    scrollTargetRef.current = null;
    document.getElementById(target)?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }, [turns, reduced]);

  const focusComposer = () => requestAnimationFrame(() => composerRef.current?.focus());

  const applyFill = useCallback((text, kind) => {
    setDraft(text);
    setLastInserted(kind === "interpretation" ? text : null);
    requestAnimationFrame(() => composerRef.current?.focus(true));
  }, []);

  const fillDraft = useCallback(
    (text, kind) => {
      const cur = draftRef.current;
      const unedited = kind === "interpretation" && lastInserted !== null && cur === lastInserted;
      if (!cur.trim() || cur === text || unedited) applyFill(text, kind);
      else setConfirm({ type: "replace", text, kind });
    },
    [lastInserted, applyFill],
  );

  useEffect(() => {
    if (!previewBus) return undefined;
    const offs = [
      previewBus.on("inactivity", () => {
        setLastActivity(Date.now() - HOUR - 60000);
        setNow(Date.now());
      }),
      previewBus.on("reloadSources", () => reloadSources()),
      previewBus.on("canonicalQuestion", () => fillDraft(CANONICAL_QUESTION, "question")),
    ];
    return () => offs.forEach((off) => off());
  }, [reloadSources, fillDraft]);

  const sourceReady = source.status === "ready" && !source.revalidating;
  const rateLimited = now < retryUntil;
  const canSend = sourceReady && !pending && !rateLimited && draft.trim() !== "" && draft.length <= DRAFT_LIMIT;

  const submit = async () => {
    if (inflightRef.current !== null || !canSend || !source.source) return;
    const text = draftRef.current;
    const id = uid();
    const sourceId = source.source.id;
    const sid = sessionId;
    inflightRef.current = text;
    setPending(true);
    setNewResultId(null);
    setRestoreNotice(false);
    setTurns((ts) => [...ts, { id, question: text, startedAt: Date.now(), result: null }]);
    setDraft("");
    setLastInserted(null);
    setLastActivity(Date.now());
    scrollTargetRef.current = `turn-${id}`;
    announce("Question sent.");

    let result;
    try {
      const res = await api.query({ message: text, session_id: sid, data_source_id: sourceId });
      if (!aliveRef.current) return;
      if (res.status === 401) {
        authLost(draftRef.current.trim() ? draftRef.current : text);
        return;
      }
      result = classifyResponse(res, { sessionId: sid, sourceId });
    } catch (e) {
      if (!aliveRef.current) return;
      result = e instanceof TransportError ? { kind: "network" } : { kind: "compat" };
    }

    const el = document.getElementById(`turn-${id}`);
    const visible = el && convRef.current ? isVisibleIn(el, convRef.current) : true;
    inflightRef.current = null;
    setPending(false);
    setLastActivity(Date.now());
    if (result.kind === "rateLimited" && result.retryAfter) {
      setRetryUntil(Date.now() + result.retryAfter * 1000);
      setNow(Date.now());
    }
    setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, result } : t)));
    if (visible) scrollTargetRef.current = `result-${id}`;
    else setNewResultId(id);
    announce(announcementFor(result));
    if (result.kind === "forbidden") source.revalidate(sourceId);
  };

  const resetAnalysis = () => {
    setSessionId(newSessionId());
    setTurns([]);
    setDraft("");
    setLastInserted(null);
    setNewResultId(null);
    setRestoreNotice(false);
    setLastActivity(Date.now());
    announce("New analysis started.");
    focusComposer();
  };

  const requestNewAnalysis = () => {
    if (pending) return;
    if (turns.length || draft.trim()) setConfirm({ type: "new" });
    else resetAnalysis();
  };

  const confirmAction = () => {
    if (confirm?.type === "new") resetAnalysis();
    if (confirm?.type === "replace") applyFill(confirm.text, confirm.kind);
    setConfirm(null);
  };

  const signOut = async () => {
    setLogoutError(false);
    const ok = await auth.signOut();
    if (!ok && aliveRef.current) setLogoutError(true);
  };

  const showNewResult = () => {
    document.getElementById(`result-${newResultId}`)?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    setNewResultId(null);
  };

  const lastTurn = turns[turns.length - 1];
  const composerLabel = lastTurn?.result?.kind === "clarification" ? "Clarification" : turns.length ? "Follow-up" : "Question";

  return {
    identity, source, sessionId, turns, draft, setDraft, pending, canSend, submit, fillDraft,
    composerRef, convRef, composerLabel, newResultId, showNewResult,
    restoreNotice, dismissRestore: () => setRestoreNotice(false),
    inactive: turns.length > 0 && !pending && now - lastActivity > HOUR,
    retrySeconds: rateLimited ? Math.ceil((retryUntil - now) / 1000) : 0,
    confirm, cancelConfirm: () => setConfirm(null), confirmAction, requestNewAnalysis,
    logoutError, dismissLogoutError: () => setLogoutError(false), signOut,
  };
}
