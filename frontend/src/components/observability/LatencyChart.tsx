import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtSeconds } from "@/lib/format";
import type { LatencyPoint } from "@/lib/telemetry/types";

const SERIES = [
  { key: "p95" as const, label: "P95", color: "#818CF8" },
  { key: "avg" as const, label: "Average", color: "#34D399" },
  { key: "p50" as const, label: "P50", color: "#38BDF8" },
];

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="min-w-[150px] rounded-lg border border-[#2B3245] bg-[#0F131D]/95 px-3 py-2.5 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.9)] backdrop-blur"
      data-testid="latency-chart-tooltip"
    >
      <div className="font-mono text-[11px] text-[#7C8698]">{String(label ?? "")}</div>
      <div className="mt-2 space-y-1.5">
        {SERIES.map((s) => {
          const item = payload.find((p) => p.dataKey === s.key);
          const value = typeof item?.value === "number" ? item.value : null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-[#A7B0C2]">
                <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-[11px] text-[#F1F5F9]">{fmtSeconds(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LatencyChart({ data }: { data: LatencyPoint[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-[300px] items-center justify-center text-[13px] text-[#5D6880]"
        data-testid="latency-chart-empty"
      >
        No data for this time range
      </div>
    );
  }

  return (
    <div data-testid="latency-overview-chart">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[#8A94A8]">
            <span className="h-[2px] w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="p95Fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1A1F2C" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#5D6880", fontSize: 11, fontFamily: "JetBrains Mono Variable, monospace" }}
              axisLine={{ stroke: "#1A1F2C" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#5D6880", fontSize: 11, fontFamily: "JetBrains Mono Variable, monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}s`}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#2B3245", strokeWidth: 1, strokeDasharray: "3 4" }}
            />
            <Area
              type="monotone"
              dataKey="p95"
              stroke="#818CF8"
              strokeWidth={2}
              fill="url(#p95Fill)"
              dot={false}
              activeDot={{ r: 3.5, fill: "#818CF8", stroke: "#0B0D13", strokeWidth: 2 }}
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#34D399"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3.5, fill: "#34D399", stroke: "#0B0D13", strokeWidth: 2 }}
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#38BDF8"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 3.5, fill: "#38BDF8", stroke: "#0B0D13", strokeWidth: 2 }}
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
