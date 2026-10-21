import { createContext, useCallback, useContext, useRef, useState } from "react";

const StatusContext = createContext(() => {});

export function StatusProvider({ children }) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  const announce = useCallback((m) => {
    setMessage("");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(m), 80);
  }, []);
  return (
    <StatusContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="status-region">
        {message}
      </div>
    </StatusContext.Provider>
  );
}

export const useAnnounce = () => useContext(StatusContext);
