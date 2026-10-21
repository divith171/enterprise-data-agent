import { rowCountText } from "@/lib/session";

export function ResultToolbar({ count, testId }) {
  const noteId = `${testId}-export-note`;
  return (
    <div className="dk-toolbar" data-testid={testId}>
      <p className="dk-row-count" data-testid={`${testId}-row-count`}>{rowCountText(count)}</p>
      <div className="dk-export">
        <button type="button" className="dk-btn dk-btn-small" disabled aria-describedby={noteId} data-testid={`${testId}-export`}>
          Export
        </button>
        <span id={noteId} className="dk-support">Not available yet</span>
      </div>
    </div>
  );
}
