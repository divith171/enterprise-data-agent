import { IS_PREVIEW, PreviewControls } from "@/api";

export function PreviewTag() {
  if (!IS_PREVIEW) return null;
  return <span className="dk-preview-tag" data-testid="preview-tag">Preview · Sample data</span>;
}

export function PreviewBar({ scope }) {
  if (!IS_PREVIEW) return null;
  return (
    <div className="dk-preview-bar" data-testid="preview-bar">
      <p>
        <strong>Preview · Sample data</strong>
        <span> — Development fixtures only. Not connected to a live DataKat account or data source.</span>
      </p>
      <PreviewControls scope={scope} />
    </div>
  );
}
