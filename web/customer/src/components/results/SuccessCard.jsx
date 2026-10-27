import { SafeMarkdown } from "@/lib/safeMarkdown";
import { ResultToolbar } from "@/components/results/ResultToolbar";
import { ResultTable } from "@/components/results/ResultTable";

export function SuccessCard({ result, turnId, onEditQuestion }) {
  const t = `result-${turnId}`;
  return (
    <article className="dk-response" aria-label="DataKat answer" data-testid={`success-card-${turnId}`}>
      <div className="dk-card">
        <h3 className="sr-only">Answer</h3>
        <div className="dk-answer" data-testid={`${t}-answer`}>
          <SafeMarkdown text={result.answer} />
        </div>
        {result.rowCount === 0 && (
          <button type="button" className="dk-btn dk-btn-small dk-card-action" onClick={onEditQuestion} data-testid={`${t}-edit-question`}>
            Edit question
          </button>
        )}
      </div>
      <section className="dk-evidence" aria-label="Supporting data">
        <ResultToolbar count={result.rowCount} testId={`${t}-toolbar`} />
        <ResultTable columns={result.columns} rows={result.rows} testId={`${t}-table`} />
        {result.truncated && (
          <p className="dk-note" data-testid={`${t}-truncated`}>Results were limited. More rows may match this query.</p>
        )}
      </section>
    </article>
  );
}
