export function UnsupportedCard({ result, turnId, onEditQuestion }) {
  return (
    <article className="dk-card" aria-labelledby={`unsup-${turnId}`} data-testid={`unsupported-card-${turnId}`} data-code={result.code}>
      <h3 id={`unsup-${turnId}`} className="dk-card-title">Analysis not supported</h3>
      <p className="dk-plain" data-testid={`unsupported-message-${turnId}`}>{result.message}</p>
      {result.missingRequirements.length > 0 && (
        <div>
          <p className="dk-support">Missing requirements</p>
          <ul className="dk-plain-list">
            {result.missingRequirements.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      <button type="button" className="dk-btn dk-btn-small dk-card-action" onClick={onEditQuestion} data-testid={`unsupported-edit-question-${turnId}`}>
        Edit question
      </button>
    </article>
  );
}
