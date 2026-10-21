import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { formatCount } from "@/lib/session";

export const DRAFT_LIMIT = 8000;
const COUNTER_AT = 6400;

export const QuestionComposer = forwardRef(function QuestionComposer(
  { value, onChange, onSubmit, label, hint, disabled, canSend, blockedMessage },
  ref,
) {
  const desktopEnter = useMediaQuery("(hover: hover) and (pointer: fine)");
  const taRef = useRef(null);
  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }));

  useLayoutEffect(() => {
    const ta = taRef.current;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, [value]);

  const len = value.length;
  const over = len > DRAFT_LIMIT;
  const describedBy = ["composer-hint", len >= COUNTER_AT && "composer-count", over && "composer-limit", blockedMessage && "composer-blocked"]
    .filter(Boolean)
    .join(" ");

  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || !desktopEnter) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (canSend && !over) onSubmit();
  };

  return (
    <form className="dk-composer" onSubmit={(e) => { e.preventDefault(); if (canSend && !over) onSubmit(); }} data-testid="question-composer">
      <label htmlFor="composer-input" className="dk-composer-label" data-testid="composer-label">{label}</label>
      <p id="composer-hint" className={hint ? "dk-support" : "sr-only"}>
        {hint || (desktopEnter ? "Press Enter to send, Shift+Enter for a new line." : "Use Send to submit.")}
      </p>
      <textarea
        id="composer-input"
        ref={taRef}
        className="dk-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a question about your data…"
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={over || undefined}
        enterKeyHint={desktopEnter ? "send" : "enter"}
        data-testid="composer-input"
      />
      <div className="dk-composer-foot">
        <div className="dk-composer-meta">
          {len >= COUNTER_AT && (
            <span id="composer-count" className={over ? "dk-error-text" : "dk-support"} data-testid="composer-counter">
              {formatCount(len)} / {formatCount(DRAFT_LIMIT)}
            </span>
          )}
          {over && (
            <span id="composer-limit" className="dk-error-text" data-testid="composer-limit-message">
              Questions can be up to 8,000 characters. Shorten it to send.
            </span>
          )}
          {blockedMessage && <span id="composer-blocked" className="dk-support" data-testid="composer-blocked-message">{blockedMessage}</span>}
        </div>
        <button type="submit" className="dk-btn dk-btn-primary dk-send" disabled={!canSend || over} data-testid="composer-send-button">
          Send
        </button>
      </div>
    </form>
  );
});
