
import { NoticeCard } from "@/components/results/NoticeCard";

const STATES = {
  error: {
    tone: "error",
    title: "We couldn't load your data source.",
    action: "Retry",
  },
  none: {
    tone: "neutral",
    title: "No data source is available for this account.",
  },
  multiple: {
    tone: "neutral",
    title: "Choose a data source from the selector above to start your analysis.",
  },
  unavailable: {
    tone: "neutral",
    title: "This data source is no longer available. Choose another available source to continue.",
  },
};

export function SourceStateNotice({ source }) {
  if (source.status === "loading") {
    return (
      <p
        className="dk-support"
        role="status"
        data-testid="source-loading"
      >
        Loading your data source…
      </p>
    );
  }

  const s = STATES[source.status];

  if (!s) return null;

  return (
    <NoticeCard
      tone={s.tone}
      title={s.title}
      actionLabel={s.action}
      onAction={source.retry}
      testId={`source-state-${source.status}`}
    />
  );
}
