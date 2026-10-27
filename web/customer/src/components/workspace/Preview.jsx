import { IS_PREVIEW, PreviewControls } from "@/api";

// Development-only: discreet sample-data disclosure plus a closed-by-default Preview tools panel.
export function PreviewIndicator({ scope, testId = "preview-indicator" }) {
  if (!IS_PREVIEW) return null;
  return (
    <div className="dk-header-tools" data-testid={testId}>
      <span className="dk-preview-indicator" title="Development fixtures. Not live data.">Preview · Sample data</span>
      <PreviewControls scope={scope} testId={`${testId}-tools-button`} />
    </div>
  );
}
