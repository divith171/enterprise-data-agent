import { Database } from "lucide-react";
import { SafeMarkdown } from "@/lib/safeMarkdown";
import { ResultToolbar } from "@/components/results/ResultToolbar";
import { ResultTable } from "@/components/results/ResultTable";
import { SqlDisclosure } from "@/components/results/SqlDisclosure";
import { PreviewTag } from "@/components/workspace/Preview";

export function SuccessCard({ result, turnId, onEditQuestion }) {
  const t = `result-${turnId}`;
  return (
    <article className="dk-card" aria-labelledby={`${t}-label`} data-testid={`success-card-${turnId}`}>
      <div className="dk-card-head">
        <h3 id={`${t}-label`} className="dk-card-label">Result</h3>
        <p className="dk-card-source">
          <Database aria-hidden="true" size={14} />
          <span className="dk-source-label">Source</span>
          <span data-testid={`${t}-source`}>{result.source.name}</span>
          <PreviewTag />
        </p>
      </div>
      <div className="dk-answer" data-testid={`${t}-answer`}>
        <SafeMarkdown text={result.answer} />
      </div>
      <ResultToolbar count={result.rowCount} testId={`${t}-toolbar`} />
      <ResultTable columns={result.columns} rows={result.rows} testId={`${t}-table`} />
      {result.truncated && (
        <p className="dk-note" data-testid={`${t}-truncated`}>Results were limited. More rows may match this query.</p>
      )}
      {result.rowCount === 0 && (
        <button type="button" className="dk-btn dk-btn-small dk-card-action" onClick={onEditQuestion} data-testid={`${t}-edit-question`}>
          Edit question
        </button>
      )}
      <SqlDisclosure sql={result.sql} testId={`${t}-sql`} />
    </article>
  );
}
