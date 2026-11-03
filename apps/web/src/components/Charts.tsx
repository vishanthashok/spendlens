import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Budget } from "../lib/types";
import { compactMoney, money, shortDate } from "../lib/format";

type TipPayload = { name?: string; value?: number; color?: string };

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 text-faint">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-4">
          <span>{item.name}</span>
          <span className="num">{money(Math.round((item.value ?? 0) * 100))}</span>
        </div>
      ))}
    </div>
  );
}

export function DailySpendChart({ points }: { points: { date: string; spendCents: number }[] }) {
  const data = points.map((point) => ({
    label: shortDate(point.date),
    Spend: point.spendCents / 100,
  }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dff56a" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#dff56a" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e5d8" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#8b927f", fontSize: 11 }} interval={4} padding={{ left: 8, right: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "#8b927f", fontSize: 11 }}
            tickFormatter={(value: number) => compactMoney(Math.round(value * 100))}
          />
          <Tooltip content={<ChartTip />} />
          <Area type="monotone" dataKey="Spend" stroke="#16180f" strokeWidth={1.6} fill="url(#spendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BudgetCompareChart({ budgets }: { budgets: Budget[] }) {
  const data = budgets.map((budget) => ({
    name: budget.name,
    Plan: budget.limitCents / 100,
    Actual: budget.actualCents / 100,
    over: budget.actualCents > budget.limitCents,
  }));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e5d8" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#5c6456", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "#8b927f", fontSize: 11 }}
            tickFormatter={(value: number) => compactMoney(Math.round(value * 100))}
          />
          <Tooltip content={<ChartTip />} />
          <Bar dataKey="Plan" fill="#e1e6cf" radius={[5, 5, 0, 0]} />
          <Bar dataKey="Actual" radius={[5, 5, 0, 0]}>
            {data.map((row) => (
              <Cell key={row.name} fill={row.over ? "#9f2d2d" : "#16180f"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
