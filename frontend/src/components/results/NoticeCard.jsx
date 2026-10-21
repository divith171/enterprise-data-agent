export const NOTICES = {
  domainError: { tone: "error", title: "Analysis couldn't be completed", body: "DataKat couldn't complete this analysis.", action: "Review and retry" },
  network: {
    tone: "error",
    title: "Connection interrupted. We couldn't confirm the result.",
    body: "The request may still be running. Review your question before trying again.",
    action: "Review question",
  },
  invalid: { tone: "error", title: "Question couldn't be sent", body: "We couldn't send this question. Review it and try again.", action: "Review question" },
  unavailable: { tone: "error", title: "DataKat is temporarily unavailable", body: "DataKat couldn't complete this request. Try again.", action: "Review and retry" },
  rateLimited: { tone: "warning", title: "Too many questions right now", body: "Wait a moment before sending another question.", action: "Review question" },
  forbidden: { tone: "error", title: "Access couldn't be confirmed", body: "We couldn't access this analysis. Check your access and try again.", action: "Review question" },
  compat: {
    tone: "error",
    title: "This response couldn't be shown",
    body: "DataKat sent a response this workspace can't display safely. Try again.",
    action: "Review and retry",
  },
};

export function NoticeCard({ tone = "error", title, body, actionLabel, onAction, testId, children }) {
  return (
    <article className={`dk-card dk-notice dk-notice-${tone}`} data-testid={testId}>
      <h3 className="dk-card-title">{title}</h3>
      {body && <p className="dk-plain">{body}</p>}
      {children}
      {actionLabel && (
        <button type="button" className="dk-btn dk-btn-small dk-card-action" onClick={onAction} data-testid={`${testId}-action`}>
          {actionLabel}
        </button>
      )}
    </article>
  );
}
