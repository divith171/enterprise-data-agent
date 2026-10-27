import { useEffect, useRef, useState } from "react";

/**
 * useVisiblePlayback — suspends a local clock when its element leaves the viewport or the tab hides.
 * `onSuspend` is called once per suspension; resumption always requires an explicit user action.
 */
export const useVisiblePlayback = (ref, onSuspend) => {
  const cb = useRef(onSuspend);
  cb.current = onSuspend;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) cb.current("offscreen");
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    const onVis = () => {
      if (document.hidden) cb.current("hidden");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref]);
};

/** Boolean: is the element currently at least `threshold` visible? */
export const useInView = (ref, threshold = 0.05) => {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
};

/** Fires once when the element reaches `threshold` visibility. Returns true afterwards. */
export const useRevealOnce = (ref, threshold = 0.2) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, shown]);
  return shown;
};

/**
 * useStagedSwap — returns the value to render plus a `leaving` flag.
 * On change: hold the old value for `outMs` (outgoing phase), then swap. Latest request always wins.
 */
export const useStagedSwap = (value, outMs, enabled = true) => {
  const [shown, setShown] = useState(value);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (shown === value) return undefined;
    if (!enabled || outMs <= 0) {
      setShown(value);
      setLeaving(false);
      return undefined;
    }
    setLeaving(true);
    const t = setTimeout(() => {
      setShown(value);
      setLeaving(false);
    }, outMs);
    return () => clearTimeout(t);
  }, [value, shown, outMs, enabled]);
  return { shown, leaving };
};
