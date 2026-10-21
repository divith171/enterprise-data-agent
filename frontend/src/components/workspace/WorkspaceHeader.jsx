import { Plus } from "lucide-react";
import { BrandLogo } from "@/components/workspace/Brand";
import { AccountMenu } from "@/components/workspace/AccountMenu";
import { SourceIndicator } from "@/components/workspace/SourceIndicator";

export function WorkspaceHeader({ source, email, onNewAnalysis, newDisabled, onSignOut }) {
  return (
    <header className="dk-header" data-testid="workspace-header">
      <div className="dk-header-desktop">
        <h1 className="dk-title">Workspace</h1>
        <SourceIndicator source={source} />
      </div>
      <div className="dk-header-mobile">
        <div className="dk-mobile-row1">
          <BrandLogo className="dk-mobile-logo" />
          <h1 className="sr-only">Workspace</h1>
          <div className="dk-mobile-actions">
            <button type="button" className="dk-btn dk-btn-small" onClick={onNewAnalysis} disabled={newDisabled} data-testid="mobile-new-analysis-button">
              <Plus aria-hidden="true" size={18} />
              New analysis
            </button>
            <AccountMenu email={email} onSignOut={onSignOut} variant="header" testId="mobile-account-button" />
          </div>
        </div>
        <div className="dk-mobile-row2">
          <SourceIndicator source={source} testId="mobile-source-indicator" />
        </div>
      </div>
    </header>
  );
}
