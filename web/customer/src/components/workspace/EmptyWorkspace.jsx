import { SourceIndicator } from "@/components/workspace/SourceIndicator";

export const UNSAVED_NOTICE = "This workspace isn't saved. Refreshing starts a new analysis.";

export function EmptyWorkspace() {
  return (
    <div className="dk-empty" data-testid="empty-workspace">
      <p className="dk-welcome-brand">DataKat · Your AI Data Analyst</p>
      <h2 className="dk-headline">Ask a question about your data.</h2>
      <p className="dk-empty-support">Describe what you want to compare, summarize, or investigate.</p>
    </div>
  );
}

export function WelcomeMeta({ source }) {
  return (
    <div className="dk-welcome-meta">
      <SourceIndicator source={source} testId="empty-source-indicator" />
      <p className="dk-support" data-testid="unsaved-notice">{UNSAVED_NOTICE}</p>
    </div>
  );
}
