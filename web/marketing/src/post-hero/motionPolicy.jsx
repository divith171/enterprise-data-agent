import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const MotionPolicyContext = createContext(null);
const QUERY = "(prefers-reduced-motion: reduce)";

export const MotionPolicyProvider = ({ children }) => {
  const [osReduced, setOsReduced] = useState(() => window.matchMedia(QUERY).matches);
  const [userMotion, setUserMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setOsReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleUserMotion = useCallback(() => setUserMotion((v) => !v), []);

  const value = useMemo(
    () => ({ osReduced, userMotion, effectiveMotion: userMotion && !osReduced, toggleUserMotion }),
    [osReduced, userMotion, toggleUserMotion]
  );
  return <MotionPolicyContext.Provider value={value}>{children}</MotionPolicyContext.Provider>;
};

export const useMotionPolicy = () => useContext(MotionPolicyContext);

export const MotionToggle = ({ id }) => {
  const { osReduced, userMotion, toggleUserMotion } = useMotionPolicy();
  return (
    <button
      type="button"
      id={id}
      data-testid={`${id}-button`}
      className="ph-btn ph-btn--ghost"
      aria-pressed={userMotion}
      onClick={toggleUserMotion}
      disabled={osReduced}
      title={osReduced ? "Your system reduced-motion setting is in effect" : "Page demonstrations"}
    >
      <span className="ph-btn__scope">Page demonstrations</span>
      {userMotion && !osReduced ? "Motion on" : "Motion off"}
    </button>
  );
};
