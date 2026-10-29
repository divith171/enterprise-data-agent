
import { Plus } from "lucide-react";
import { BrandLogo } from "@/components/workspace/Brand";
import { AccountMenu } from "@/components/workspace/AccountMenu";
import { SourceIndicator } from "@/components/workspace/SourceIndicator";
import { PreviewIndicator } from "@/components/workspace/Preview";

export function WorkspaceHeader({
  source,
  email,
  onNewAnalysis,
  newDisabled,
  onSignOut,
  onSourceChange,
  sourceSelectionDisabled = false,
}) {
  return (
    <header className="dk-header" data-testid="workspace-header">
      <div className="dk-header-desktop">
        <BrandLogo className="dk-header-logo" />
        <h1 className="sr-only">DataKat workspace</h1>
        <SourceIndicator
          source={source}
          onSourceChange={onSourceChange}
          disabled={sourceSelectionDisabled}
        />
        <PreviewIndicator scope="app" testId="preview-indicator" />
      </div>

      <div className="dk-header-mobile">
        <div className="dk-mobile-row1">
          <BrandLogo className="dk-mobile-logo" />
          <h1 className="sr-only">DataKat workspace</h1>

          <div className="dk-mobile-actions">
            <button
              type="button"
              className="dk-btn dk-btn-small"
              onClick={onNewAnalysis}
              disabled={newDisabled}
              data-testid="mobile-new-analysis-button"
            >
              <Plus aria-hidden="true" size={18} />
              New analysis
            </button>

            <AccountMenu
              email={email}
              onSignOut={onSignOut}
              variant="header"
              testId="mobile-account-button"
            />
          </div>
        </div>

        <div className="dk-mobile-row2">
          <SourceIndicator
            source={source}
            testId="mobile-source-indicator"
            onSourceChange={onSourceChange}
            disabled={sourceSelectionDisabled}
          />
          <PreviewIndicator
            scope="app"
            testId="mobile-preview-indicator"
          />
        </div>
      </div>
    </header>
  );
}
