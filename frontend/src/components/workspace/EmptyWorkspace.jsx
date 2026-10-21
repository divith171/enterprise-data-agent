import { SourceIndicator } from "@/components/workspace/SourceIndicator";

export const UNSAVED_NOTICE = "This workspace isn't saved. Refreshing starts a new analysis.";

export function EmptyWorkspace({ source }) {
  return (
    <div className="dk-empty" data-testid="empty-workspace">
      <h2 className="dk-headline">Ask a question about your data.</h2>
      <p className="dk-empty-support">Describe what you want to compare, summarize, or investigate.</p>
      <SourceIndicator source={source} testId="empty-source-indicator" />
      <p className="dk-support" data-testid="unsaved-notice">{UNSAVED_NOTICE}</p>
    </div>
  );
}
