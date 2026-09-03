import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "./Sidebar";
import { PLATFORM_NAV } from "./nav";
import { cn } from "@/lib/utils";

export default function AppShell({
  children,
  connected = null,
}: {
  children: ReactNode;
  connected?: boolean | null;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0D13] text-[#F8FAFC]">
      <Sidebar connected={connected} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[#161A24] bg-[#080A0F] px-4 py-2 lg:hidden">
          <span className="mr-3 shrink-0 text-[11px] font-semibold tracking-[0.14em] text-[#E2E8F0]">
            ENTERPRISE DATA AGENT
          </span>
          {PLATFORM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={`mobile-${item.testid}`}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-md px-2 py-1 text-[12px] transition-colors",
                  isActive ? "bg-[#141824] text-[#EEF2FF]" : "text-[#8A94A8]",
                )
              }
            >
              {item.short}
            </NavLink>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
