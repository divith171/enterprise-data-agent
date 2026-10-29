import { Database } from "lucide-react";

const TEXT = { loading: "Loading…", ready: null };

function sourceToken(id) {
  return JSON.stringify([typeof id, id]);
}

export function SourceIndicator({
  source,
  testId = "source-indicator",
  onSourceChange,
  disabled = false,
}) {
  // Existing callers remain read-only unless selection is explicitly enabled.
  if (typeof onSourceChange !== "function") {
    const name =
      source.status === "ready"
        ? source.source.name
        : TEXT[source.status] || "Not available";

    return (
      <p className="dk-source" data-testid={testId}>
        <Database
          aria-hidden="true"
          size={16}
          className="dk-source-icon"
        />
        <span className="dk-source-label">Source</span>
        <span
          className="dk-source-name"
          data-testid={`${testId}-name`}
        >
          {name}
        </span>
      </p>
    );
  }

  // The hook supplies the already-filtered, authorized, active PostgreSQL list.
  const sources = Array.isArray(source.sources) ? source.sources : [];
  const selectedSourceId = source.selectedSourceId ?? null;
  const selectedSource = sources.find(
    (item) => item.id === selectedSourceId
  );
  const value = selectedSource ? sourceToken(selectedSource.id) : "";

  const selectionDisabled =
    disabled ||
    source.revalidating ||
    !["ready", "multiple", "unavailable"].includes(source.status) ||
    sources.length === 0;

  let placeholder = "Select a data source";
  if (source.status === "loading") {
    placeholder = "Loading…";
  } else if (selectedSourceId !== null && !selectedSource) {
    placeholder = "Selected source unavailable";
  } else if (sources.length === 0) {
    placeholder = "Not available";
  }

  function handleChange(event) {
    if (selectionDisabled) return;

    const nextSource = sources.find(
      (item) => sourceToken(item.id) === event.currentTarget.value
    );

    if (!nextSource || nextSource.id === selectedSourceId) return;

    // Return the original ID, never the DOM's string representation.
    // The parent owns confirmation and the coordinated session transition.
    onSourceChange(nextSource.id);
  }

  return (
    <label className="dk-source" data-testid={testId}>
      <Database
        aria-hidden="true"
        size={16}
        className="dk-source-icon"
      />
      <span className="dk-source-label">Source</span>
      <select
        className="dk-source-name"
        aria-label="PostgreSQL data source"
        data-testid={`${testId}-select`}
        value={value}
        onChange={handleChange}
        disabled={selectionDisabled}
        style={{
          minWidth: 0,
          maxWidth: "100%",
          width: "min(100%, 15rem)",
          minHeight: 44,
          padding: "6px 10px",
          border: "1px solid var(--dk-control)",
          borderRadius: 10,
          background: "var(--dk-raised)",
          color: "var(--dk-text)",
          fontSize: "inherit",
          fontWeight: 500,
          lineHeight: "inherit",
          textOverflow: "ellipsis",
          cursor: selectionDisabled ? "not-allowed" : "pointer",
          opacity: selectionDisabled ? 0.65 : 1,
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {sources.map((item) => {
          const token = sourceToken(item.id);

          return (
            <option key={token} value={token}>
              {item.name}
            </option>
          );
        })}
      </select>
    </label>
  );
}