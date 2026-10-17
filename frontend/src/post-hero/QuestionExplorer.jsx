import { FIXTURES, FIXTURE_ORDER } from "./demoFixtures";

export const QuestionExplorer = ({ selectedId, onSelect }) => (
  <ul className="ph-qlist" aria-label="Example questions" data-testid="question-list">
    {FIXTURE_ORDER.map((id) => {
      const f = FIXTURES[id];
      const selected = id === selectedId;
      return (
        <li key={id}>
          <button
            type="button"
            className="ph-qbtn"
            aria-pressed={selected}
            onClick={() => { if (!selected) onSelect(id); }}
            data-testid={`question-${id}`}
          >
            <span>{f.question}</span>
            {selected && <span className="ph-qbtn__sel">Selected</span>}
          </button>
        </li>
      );
    })}
  </ul>
);
