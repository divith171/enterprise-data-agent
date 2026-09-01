import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "positive" | "warning" | "negative" | "accent";

const TONE_VALUE: Record<MetricTone, string> = {
  neutral: "text-[#F8FAFC]",
  positive: "text-[#6EE7B7]",
  warning: "text-[#FCD34D]",
  negative: "text-[#FCA5A5]",
  accent: "text-[#A5B4FC]",
};

const TONE_ICON: Record<MetricTone, string> = {
  neutral: "text-[#6E7A94]",
  positive: "text-[#34D399]",
  warning: "text-[#FBBF24]",
  negative: "text-[#F87171]",
  accent: "text-[#818CF8]",
};

interface MetricCardProps {
  label: string;
  value: string;
  /** Small qualifier rendered next to the value, e.g. "P95". */
  unit?: string;
  hint: string;
  icon: LucideIcon;
  tone?: MetricTone;
  testid: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  testid,
}: MetricCardProps) {
  return (
    <div
      data-testid={testid}
      className="group animate-rise rounded-xl border border-[#1E2433] bg-[#11141E] px-4 py-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-[1px] hover:border-[#2D3748] hover:bg-[#131723]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-[0.1em] text-[#5D6880]">{label}</span>
        <Icon className={cn("size-3.5 shrink-0 transition-colors", TONE_ICON[tone])} strokeWidth={1.9} />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn("font-mono text-[24px] leading-none tracking-[-0.02em]", TONE_VALUE[tone])}
          data-testid={`${testid}-value`}
        >
          {value}
        </span>
        {unit && <span className="text-[10px] font-medium tracking-[0.08em] text-[#5D6880]">{unit}</span>}
      </div>

      <div className="mt-2.5 text-[12px] text-[#7C8698]" data-testid={`${testid}-hint`}>
        {hint}
      </div>
    </div>
  );
}
