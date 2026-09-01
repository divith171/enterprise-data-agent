import { NavLink } from "react-router-dom";
import { Activity, GitBranch, ListTree, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { TELEMETRY_SOURCE_LABEL } from "@/lib/telemetry/source";

const NAV = [
  { to: "/", label: "Observability", icon: Activity, testid: "nav-item-observability" },
  { to: "/explorer", label: "Pipeline Explorer", icon: GitBranch, testid: "nav-item-pipeline-explorer" },
  { to: "/traces", label: "Request Traces", icon: ListTree, testid: "nav-item-request-traces" },
];

export default function Sidebar() {
  return (
    <aside
      className="hidden w-60 shrink-0 flex-col justify-between border-r border-[#161A24] bg-[#080A0F] lg:flex"
      data-testid="app-sidebar"
    >
      <div>
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex size-9 items-center justify-center rounded-[10px] border border-[#262E44] bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] shadow-[0_6px_16px_-6px_rgba(79,70,229,0.9)]">
            <Database className="size-4 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-none" data-testid="brand-mark">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-[#E2E8F0]">ENTERPRISE</div>
            <div className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-[#6E7A94]">DATA AGENT</div>
          </div>
        </div>

        <nav className="px-3">
          <div className="px-2 pb-2 text-[10px] font-semibold tracking-[0.14em] text-[#4C566E]">PLATFORM</div>
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  data-testid={item.testid}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:outline-none",
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
                        className={cn("size-4 transition-colors", isActive ? "text-[#818CF8]" : "text-[#5D6880]")}
                        strokeWidth={1.9}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="m-3 rounded-lg border border-[#161A24] bg-[#0C0F17] p-3">
        <div className="flex items-center gap-2 text-[11px] text-[#6E7A94]">
          <span className="size-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          Telemetry stream
        </div>
        <div className="mt-1.5 font-mono text-[11px] text-[#4C566E]">{TELEMETRY_SOURCE_LABEL}</div>
      </div>
    </aside>
  );
}
