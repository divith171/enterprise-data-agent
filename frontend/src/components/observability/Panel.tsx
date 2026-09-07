import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testid?: string;
  /** Removes body padding for edge-to-edge tables. */
  flush?: boolean;
}

export default function Panel({
  title,
  description,
  action,
  children,
  className,
  testid,
  flush = false,
}: PanelProps) {
  return (
    <section
      data-testid={testid}
      className={cn(
        "animate-rise rounded-xl border border-[#1E2433] bg-[#11141E] transition-colors duration-200 hover:border-[#252D3E]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1A1F2C] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#E9EDF5]">{title}</h2>
          {description && <p className="mt-1 text-[12px] text-[#6E7A94]">{description}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? "" : "px-5 py-5"}>{children}</div>
    </section>
  );
}
