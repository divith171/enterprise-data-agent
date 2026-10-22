import { Check, HelpCircle } from "lucide-react";

function Questions({ questions }) {
  if (!questions.length) return null;
  if (questions.length === 1) return <p className="dk-plain">{questions[0]}</p>;
  return (
    <ol className="dk-plain-list">
      {questions.map((q, i) => <li key={i}>{q}</li>)}
    </ol>
  );
}

function Interpretations({ items, active, draft, onChoose, turnId }) {
  if (!items.length) return null;
  if (!active) {
    return (
      <div className="dk-interps-readonly">
        <p className="dk-support">Interpretations offered</p>
        <ul className="dk-plain-list">{items.map((o, i) => <li key={i}>{o}</li>)}</ul>
      </div>
    );
  }
  return (
    <div className="dk-interps" role="group" aria-labelledby={`interp-guide-${turnId}`}>
      <p id={`interp-guide-${turnId}`} className="dk-support">Choose an interpretation or write your own.</p>
      {items.map((o, i) => {
        const inDraft = draft === o;
        return (
          <button key={i} type="button" className={`dk-interp${inDraft ? " dk-interp-selected" : ""}`} onClick={() => onChoose(o)} data-testid={`interpretation-${turnId}-${i}`}>
            <span className="dk-interp-text">{o}</span>
            {inDraft && (
              <span className="dk-interp-flag" data-testid={`interpretation-${turnId}-${i}-in-draft`}>
                <Check aria-hidden="true" size={14} /> In draft
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ClarificationCard({ result, turnId, active, draft, onChoose }) {
  return (
    <article className="dk-card" aria-labelledby={`clar-${turnId}`} data-testid={`clarification-card-${turnId}`}>
      <h3 id={`clar-${turnId}`} className="dk-card-title">
        <HelpCircle aria-hidden="true" size={18} className="dk-title-icon" />
        Clarification needed
      </h3>
      {result.message && <p className="dk-plain">{result.message}</p>}
      <Questions questions={result.questions} />
      <Interpretations items={result.interpretations} active={active} draft={draft} onChoose={onChoose} turnId={turnId} />
    </article>
  );
}
