import { NavRail } from "@/components/workspace/NavRail";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { PreviewBar } from "@/components/workspace/Preview";
import { EmptyWorkspace, UNSAVED_NOTICE } from "@/components/workspace/EmptyWorkspace";
import { SourceStateNotice } from "@/components/workspace/SourceStateNotice";
import { ConversationTurn } from "@/components/workspace/ConversationTurn";
import { QuestionComposer } from "@/components/workspace/QuestionComposer";
import { ConfirmDialog } from "@/components/workspace/ConfirmDialog";
import { useWorkspace } from "@/workspace/useWorkspace";

function ComposerNotices({ w }) {
  return (
    <>
      {w.newResultId && (
        <button type="button" className="dk-btn dk-btn-small dk-new-result" onClick={w.showNewResult} data-testid="new-result-button">
          New result
        </button>
      )}
      {w.restoreNotice && (
        <div className="dk-inline-notice dk-inline-warning" data-testid="restore-notice">
          <p>This is a new analysis. Include any earlier filters in your question.</p>
          <button type="button" className="dk-link-btn" onClick={w.dismissRestore} data-testid="restore-notice-dismiss">Dismiss</button>
        </div>
      )}
      {w.inactive && (
        <div className="dk-inline-notice dk-inline-warning" data-testid="inactivity-notice">
          <p>This analysis may no longer retain its earlier context.</p>
          <button type="button" className="dk-link-btn" onClick={w.requestNewAnalysis} data-testid="inactivity-new-analysis">Start new analysis</button>
        </div>
      )}
      {w.source.revalidating && <p className="dk-support" role="status" data-testid="access-revalidating">Checking your access…</p>}
    </>
  );
}

function blockedMessage(w) {
  if (w.retrySeconds > 0) return `You can send again in ${w.retrySeconds} ${w.retrySeconds === 1 ? "second" : "seconds"}.`;
  if (w.pending) return "You can keep typing. Send is available when the current result arrives.";
  return null;
}

export default function WorkspacePage() {
  const w = useWorkspace();
  const { source, turns } = w;
  const replace = w.confirm?.type === "replace";
  return (
    <div className="dk-app" data-testid="workspace-page">
      <a href="#workspace-main" className="dk-skip" onClick={(e) => { e.preventDefault(); document.getElementById("workspace-main").focus(); }} data-testid="skip-to-workspace">
        Skip to workspace
      </a>
      <NavRail email={w.identity.email} onNewAnalysis={w.requestNewAnalysis} newDisabled={w.pending} onSignOut={w.signOut} />
      <div className="dk-main">
        <PreviewBar scope="app" />
        <WorkspaceHeader source={source} email={w.identity.email} onNewAnalysis={w.requestNewAnalysis} newDisabled={w.pending} onSignOut={w.signOut} />
        <main id="workspace-main" tabIndex={-1} className="dk-workspace">
          <div className="dk-conversation" ref={w.convRef} data-testid="conversation">
            <div className="dk-content dk-conversation-inner">
              {w.logoutError && (
                <div className="dk-inline-notice dk-inline-error" role="alert" data-testid="logout-error">
                  <p>We couldn't sign you out. Your session may still be active.</p>
                  <button type="button" className="dk-link-btn" onClick={w.dismissLogoutError}>Dismiss</button>
                </div>
              )}
              <SourceStateNotice source={source} />
              {turns.length === 0 ? (
                <EmptyWorkspace source={source} />
              ) : (
                <>
                  <h2 className="sr-only">Analysis</h2>
                  <p className="dk-support" data-testid="unsaved-notice">{UNSAVED_NOTICE}</p>
                  {turns.map((t, i) => (
                    <ConversationTurn key={t.id} turn={t} active={i === turns.length - 1 && Boolean(t.result)} draft={w.draft} onFill={w.fillDraft} />
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="dk-composer-row">
            <div className="dk-content">
              <ComposerNotices w={w} />
              <QuestionComposer
                ref={w.composerRef}
                value={w.draft}
                onChange={w.setDraft}
                onSubmit={w.submit}
                label={w.composerLabel}
                hint={w.composerLabel === "Follow-up" ? "Follow-ups use this analysis's context." : null}
                disabled={source.status !== "ready"}
                canSend={w.canSend}
                blockedMessage={blockedMessage(w)}
              />
            </div>
          </div>
        </main>
      </div>
      <ConfirmDialog
        open={Boolean(w.confirm)}
        title={replace ? (w.confirm.kind === "interpretation" ? "Replace your draft with this interpretation?" : "Replace your draft?") : "Start a new analysis?"}
        description={replace ? null : "This workspace isn't saved. Starting again clears this view."}
        cancelLabel={replace ? "Keep draft" : "Keep working"}
        confirmLabel={replace ? "Replace draft" : "Start new analysis"}
        onCancel={w.cancelConfirm}
        onConfirm={w.confirmAction}
        testId={replace ? "replace-draft-dialog" : "new-analysis-dialog"}
      />
    </div>
  );
}
