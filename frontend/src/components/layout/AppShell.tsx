import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { to: "/", label: "Observability" },
  { to: "/explorer", label: "Explorer" },
  { to: "/traces", label: "Traces" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0D13] text-[#F8FAFC]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-1 border-b border-[#161A24] bg-[#080A0F] px-4 py-2 lg:hidden">
          <span className="mr-3 text-[11px] font-semibold tracking-[0.14em] text-[#E2E8F0]">
            ENTERPRISE DATA AGENT
          </span>
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2 py-1 text-[12px] transition-colors",
                  isActive ? "bg-[#141824] text-[#EEF2FF]" : "text-[#8A94A8]",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
