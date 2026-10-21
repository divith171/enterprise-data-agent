import { User, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({ email, onSignOut, variant, testId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`dk-account-btn dk-account-${variant}`} data-testid={testId}>
          <User aria-hidden="true" size={20} />
          <span className={variant === "rail" ? "dk-rail-label" : "sr-only"}>Account</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={variant === "rail" ? "right" : "bottom"} align="end" className="dk-menu" data-testid="account-menu">
        <DropdownMenuLabel className="dk-menu-label">
          <span className="dk-support">Signed in as</span>
          <span className="dk-menu-email" data-testid="account-email">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="dk-menu-sep" />
        <DropdownMenuItem className="dk-menu-item" onSelect={onSignOut} data-testid="sign-out-button">
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
