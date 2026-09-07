import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";

export type StatTone = "neutral" | "positive" | "warning" | "negative" | "accent" | "muted";

const TONE: Record<StatTone, string> = {
  neutral: "text-[#F1F5F9]",
  positive: "text-[#6EE7B7]",
  warning: "text-[#FCD34D]",
  negative: "text-[#FCA5A5]",
  accent: "text-[#A5B4FC]",
  muted: "text-[#7C8698]",
};

export interface StatItem {
  label: string;
  value: string;
  tone?: StatTone;
  hint?: string;
}

/**
 * Dense label/value grid. Used instead of one card per metric, so a page can present
 * many real numbers without turning into card clutter.
 */
export default function StatList({
  items,
  columns = 4,
  testid,
}: {
  items: StatItem[];
  columns?: 2 | 3 | 4;
  testid?: string;
}) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <dl className={cn("grid grid-cols-1 gap-x-8 gap-y-5", colClass)} data-testid={testid}>
      {items.map((item) => {
        const unavailable = item.value === NOT_AVAILABLE;
        return (
          <div
            key={item.label}
            className="min-w-0"
            data-testid={`stat-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            <dt className="text-[10px] font-semibold tracking-[0.1em] text-[#5D6880]">
              {item.label.toUpperCase()}
            </dt>
            <dd
              className={cn(
                "mt-2 font-mono text-[17px] leading-none tracking-[-0.01em]",
                unavailable ? "text-[13px] text-[#4C566E] italic" : TONE[item.tone ?? "neutral"],
              )}
            >
              {item.value}
            </dd>
            {item.hint && <div className="mt-1.5 text-[11.5px] text-[#6E7A94]">{item.hint}</div>}
          </div>
        );
      })}
    </dl>
  );
}
