import { useEffect, useState } from "react";

const messageFor = (s) => {
  if (s >= 45) return "This is taking longer than usual. Waiting for DataKat's response.";
  if (s >= 15) return "Still working on your question…";
  return "Working on your question…";
};

export function PendingResponse({ startedAt, turnId }) {
  const [elapsed, setElapsed] = useState(() => (Date.now() - startedAt) / 1000);
  useEffect(() => {
    const t = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return (
    <div className="dk-card dk-pending" aria-busy="true" data-testid={`pending-response-${turnId}`}>
      <span className="dk-activity" aria-hidden="true" />
      <div>
        <p className="dk-pending-title" data-testid={`pending-message-${turnId}`}>{messageFor(elapsed)}</p>
        <p className="dk-support">Results will appear here when they're ready.</p>
      </div>
    </div>
  );
}
