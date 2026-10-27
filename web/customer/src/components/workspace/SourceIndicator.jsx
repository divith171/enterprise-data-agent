import { Database } from "lucide-react";

const TEXT = { loading: "Loading…", ready: null };

export function SourceIndicator({ source, testId = "source-indicator" }) {
  const name = source.status === "ready" ? source.source.name : TEXT[source.status] || "Not available";
  return (
    <p className="dk-source" data-testid={testId}>
      <Database aria-hidden="true" size={16} className="dk-source-icon" />
      <span className="dk-source-label">Source</span>
      <span className="dk-source-name" data-testid={`${testId}-name`}>{name}</span>
    </p>
  );
}
