import { NavLink } from "react-router-dom";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { TELEMETRY_SOURCE_DETAIL, TELEMETRY_SOURCE_LABEL } from "@/lib/telemetry/source";
import { PLATFORM_NAV } from "./nav";

export default function Sidebar({ connected }: { connected: boolean | null }) {
  return (
    <aside
      className="hidden w-[248px] shrink-0 flex-col justify-between border-r border-[#161A24] bg-[#080A0F] lg:flex"
      data-testid="app-sidebar"
    >
      <div>
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex size-9 items-center justify-center rounded-[10px] border border-[#262E44] bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] shadow-[0_8px_20px_-8px_rgba(79,70,229,0.85)]">
            <Database className="size-4 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-none" data-testid="brand-mark">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-[#E2E8F0]">ENTERPRISE</div>
            <div className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-[#6E7A94]">
              DATA AGENT
            </div>
          </div>
        </div>

        <nav className="px-3 pb-4">
          <div className="px-2 pb-2 text-[10px] font-semibold tracking-[0.14em] text-[#4C566E]">
            PLATFORM
          </div>
          <ul className="space-y-[2px]">
            {PLATFORM_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  data-testid={item.testid}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-[color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none",
                      isActive
                        ? "bg-[#141824] font-medium text-[#EEF2FF]"
                        : "text-[#8A94A8] hover:bg-[#0F121C] hover:text-[#D6DCE8]",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-150",
                          isActive ? "bg-[#6366F1] opacity-100" : "opacity-0",
                        )}
                      />
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          isActive ? "text-[#818CF8]" : "text-[#5D6880]",
                        )}
                        strokeWidth={1.9}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="m-3 rounded-lg border border-[#161A24] bg-[#0C0F17] px-3 py-2.5" data-testid="source-status">
        <div className="flex items-center gap-2 text-[11px] text-[#8A94A8]">
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected === null
                ? "bg-[#64748B]"
                : connected
                  ? "bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : "bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]",
            )}
          />
          {TELEMETRY_SOURCE_LABEL}
          <span className="ml-auto text-[10px] tracking-[0.08em] text-[#4C566E]">
            {connected === null ? "…" : connected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
        <div className="mt-1.5 truncate font-mono text-[10.5px] text-[#4C566E]">
          {TELEMETRY_SOURCE_DETAIL}
        </div>
      </div>
    </aside>
  );
}
