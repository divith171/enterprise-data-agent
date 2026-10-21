import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import { validIdentity } from "@/lib/queryContract";

const AuthContext = createContext(null);

const pick = ({ id, company_id, email, role }) => ({ id, company_id, email, role });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "unknown", identity: null, sessionEnded: false });
  const identityRef = useRef(null);
  const restoreRef = useRef(null);

  const set = useCallback((next) => {
    identityRef.current = next.identity;
    setState(next);
  }, []);

  const verify = useCallback(async () => {
    setState((s) => ({ ...s, status: "checking" }));
    try {
      const r = await api.me();
      if (r.status === 200 && validIdentity(r.body)) {
        const identity = pick(r.body);
        set({ status: "authenticated", identity, sessionEnded: false });
        return { ok: true, identity };
      }
      if (r.status === 401 || r.status === 403) {
        set({ status: "unauthenticated", identity: null, sessionEnded: false });
        return { ok: false, reason: "unauthenticated" };
      }
    } catch {
      // transport failure handled below
    }
    set({ status: "error", identity: null, sessionEnded: false });
    return { ok: false, reason: "error" };
  }, [set]);

  // Draft text survives only in memory and only for the same user and company.
  const authLost = useCallback(
    (draftText) => {
      const prev = identityRef.current;
      restoreRef.current = prev && draftText && draftText.trim() ? { id: prev.id, company_id: prev.company_id, text: draftText } : null;
      set({ status: "unauthenticated", identity: null, sessionEnded: true });
    },
    [set],
  );

  const takeRestore = useCallback(() => {
    const r = restoreRef.current;
    const me = identityRef.current;
    restoreRef.current = null;
    return r && me && r.id === me.id && r.company_id === me.company_id ? r.text : null;
  }, []);

  const signOut = useCallback(async () => {
    try {
      const r = await api.logout();
      if (r.status >= 200 && r.status < 300) {
        restoreRef.current = null;
        set({ status: "unauthenticated", identity: null, sessionEnded: false });
        return true;
      }
    } catch {
      // not confirmed
    }
    return false;
  }, [set]);

  const value = useMemo(() => ({ ...state, verify, authLost, takeRestore, signOut }), [state, verify, authLost, takeRestore, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
