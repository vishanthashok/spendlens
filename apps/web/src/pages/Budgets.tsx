import { BudgetCompareChart } from "../components/Charts";
import { ErrorBlock, LoadingBlock, Meter } from "../components/ui";
import { useBudgets } from "../hooks/useSpend";
import { errorText } from "../lib/api";
import { cn } from "../lib/cn";
import { money, percent } from "../lib/format";

export function Budgets() {
  const budgets = useBudgets();
  if (budgets.isLoading) return <LoadingBlock label="Loading budgets…" />;
  if (budgets.isError || !budgets.data) {
    return <ErrorBlock message={errorText(budgets.error)} onRetry={() => void budgets.refetch()} />;
  }

  const rows = budgets.data;
  const plan = rows.reduce((sum, row) => sum + row.limitCents, 0);
  const actual = rows.reduce((sum, row) => sum + row.actualCents, 0);
  const over = rows.filter((row) => row.actualCents > row.limitCents);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">October plan</p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl tracking-tight md:text-5xl">
        {money(actual)} spent against {money(plan)}.
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        {over.length
          ? `${over.map((row) => row.name).join(", ")} ${over.length === 1 ? "is" : "are"} past plan. Everything else still has room.`
          : "Every budget is inside its plan."}
      </p>

      <section className="mt-6 rounded-3xl border border-line bg-white p-5">
        <h2 className="font-medium">Budget versus actual</h2>
        <div className="mt-2">
          <BudgetCompareChart budgets={rows} />
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-faint">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 text-right font-medium">Plan</th>
                <th className="px-4 py-3 text-right font-medium">Actual</th>
                <th className="px-4 py-3 text-right font-medium">Variance</th>
                <th className="px-4 py-3 font-medium">Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hot = row.actualCents > row.limitCents;
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-faint">{row.categories.join(", ")}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.owner}
                      <div className="text-xs text-faint">{row.department}</div>
                    </td>
                    <td className="num px-4 py-3 text-right">{money(row.limitCents)}</td>
                    <td className={cn("num px-4 py-3 text-right", hot && "text-danger")}>{money(row.actualCents)}</td>
                    <td className={cn("num px-4 py-3 text-right", hot ? "text-danger" : "text-moss")}>
                      {hot ? "−" : "+"}
                      {money(Math.abs(row.varianceCents))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="mb-1 text-xs text-muted">{percent(row.actualCents, row.limitCents)}%</div>
                      <Meter value={row.actualCents} max={row.limitCents} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
