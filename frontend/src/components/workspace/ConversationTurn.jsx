import { SuccessCard } from "@/components/results/SuccessCard";
import { ClarificationCard } from "@/components/results/ClarificationCard";
import { UnsupportedCard } from "@/components/results/UnsupportedCard";
import { NoticeCard, NOTICES } from "@/components/results/NoticeCard";
import { PendingResponse } from "@/components/results/PendingResponse";

function ResultCard({ turn, active, draft, onFill }) {
  const r = turn.result;
  const editQuestion = () => onFill(turn.question, "question");
  if (r.kind === "success") return <SuccessCard result={r} turnId={turn.id} onEditQuestion={editQuestion} />;
  if (r.kind === "clarification") {
    return <ClarificationCard result={r} turnId={turn.id} active={active} draft={draft} onChoose={(o) => onFill(o, "interpretation")} />;
  }
  if (r.kind === "unsupported") return <UnsupportedCard result={r} turnId={turn.id} onEditQuestion={editQuestion} />;
  const n = NOTICES[r.kind];
  return (
    <NoticeCard tone={n.tone} title={n.title} body={n.body} actionLabel={n.action} onAction={editQuestion} testId={`notice-card-${r.kind}-${turn.id}`} />
  );
}

export function ConversationTurn({ turn, active, draft, onFill }) {
  return (
    <section className="dk-turn" id={`turn-${turn.id}`} aria-label="Question and result" data-testid={`turn-${turn.id}`}>
      <div className="dk-question">
        <p className="dk-question-label">Your question</p>
        <p className="dk-question-text" data-testid={`question-text-${turn.id}`}>{turn.question}</p>
      </div>
      {turn.result ? (
        <div id={`result-${turn.id}`} className="dk-result-anchor">
          <ResultCard turn={turn} active={active} draft={draft} onFill={onFill} />
        </div>
      ) : (
        <PendingResponse startedAt={turn.startedAt} turnId={turn.id} />
      )}
    </section>
  );
}
