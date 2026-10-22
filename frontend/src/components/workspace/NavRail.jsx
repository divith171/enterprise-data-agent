import { Link } from "react-router-dom";
import { LayoutGrid, Plus } from "lucide-react";
import { AccountMenu } from "@/components/workspace/AccountMenu";

export function NavRail({ email, onNewAnalysis, newDisabled, onSignOut }) {
  return (
    <nav className="dk-rail" aria-label="Primary" data-testid="nav-rail">
      <Link to="/app" className="dk-rail-item dk-rail-active" aria-current="page" data-testid="rail-workspace-link">
        <LayoutGrid aria-hidden="true" size={20} />
        <span className="dk-rail-label">Workspace</span>
      </Link>
      <button type="button" className="dk-rail-item" onClick={onNewAnalysis} disabled={newDisabled} data-testid="rail-new-analysis-button">
        <Plus aria-hidden="true" size={20} />
        <span className="dk-rail-label">New analysis</span>
      </button>
      <div className="dk-rail-bottom">
        <AccountMenu email={email} onSignOut={onSignOut} variant="rail" testId="rail-account-button" />
      </div>
    </nav>
  );
}
