import { Link } from "react-router-dom";

import { BudgetCompareChart, DailySpendChart } from "../components/Charts";
import { CardFace } from "../components/CardFace";
import { ErrorBlock, LoadingBlock, Meter } from "../components/ui";
import { useCards, useSummary } from "../hooks/useSpend";
import { errorText } from "../lib/api";
import { money, percent } from "../lib/format";

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="num mt-2 text-2xl tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted">{hint}</div>
    </div>
  );
}

export function Overview() {
  const summary = useSummary();
  const cards = useCards();

  if (summary.isLoading || cards.isLoading) return <LoadingBlock />;
  if (summary.isError || cards.isError || !summary.data || !cards.data) {
    return (
      <ErrorBlock
        message={errorText(summary.error ?? cards.error)}
        onRetry={() => {
          void summary.refetch();
          void cards.refetch();
        }}
      />
    );
  }

  const data = summary.data;
  const under = data.varianceCents >= 0;
  const maxCategory = data.byCategory[0]?.spendCents ?? 1;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">
        {data.companyName} · {data.teamLabel}
      </p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
        {under ? "October finished " : "October ran "}
        <span className="bg-lime px-1 italic">{money(Math.abs(data.varianceCents))}</span>
        {under ? " under plan." : " over plan."}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
        {data.receiptsMissing} charges still need a receipt. {data.needsReview}{" "}
        {data.needsReview === 1 ? "category is" : "categories are"} waiting on a person.
        {data.sinceCloseCents > 0
          ? ` ${money(data.sinceCloseCents)} has come in since the books closed on November 1.`
          : ""}
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="October spend" value={money(data.spendCents)} hint={`${data.transactionCount} posted and pending`} />
        <Kpi
          label={under ? "Left in plan" : "Over plan"}
          value={money(Math.abs(data.varianceCents))}
          hint={`of ${money(data.budgetCents)} budgeted`}
        />
        <Kpi label="Receipts out" value={String(data.receiptsMissing)} hint="October charges without a match" />
        <Kpi label="Cards over 80%" value={String(data.cardsNearLimit)} hint="of the October statement limit" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-3xl border border-line bg-white p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Daily spend</h2>
            <span className="text-xs text-faint">{data.periodLabel}</span>
          </div>
          <div className="mt-3">
            <DailySpendChart points={data.daily} />
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="font-medium">Where it went</h2>
          <ul className="mt-4 space-y-3">
            {data.byCategory.map((row) => (
              <li key={row.category}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span>{row.category}</span>
                  <span className="num text-muted">{money(row.spendCents)}</span>
                </div>
                <Meter tone="neutral" value={row.spendCents} max={maxCategory} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-3xl border border-line bg-white p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-medium">Budget versus actual</h2>
            <Link to="/budgets" className="text-sm text-muted underline-offset-4 hover:underline">
              Open budgets
            </Link>
          </div>
          <div className="mt-2">
            <BudgetCompareChart budgets={data.budgets} />
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="font-medium">Needs a look</h2>
          <ul className="mt-4 divide-y divide-line">
            {data.attention.length === 0 ? (
              <li className="py-6 text-sm text-muted">The close queue is clear.</li>
            ) : (
              data.attention.map((item) => (
                <li key={item.id}>
                  <Link to={item.href} className="block py-3 hover:bg-paper/80">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="mt-0.5 text-xs text-muted">{item.detail}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Statement limits</h2>
          <Link to="/cards" className="text-sm text-muted underline-offset-4 hover:underline">
            Adjust limits
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cards.data.map((card) => (
            <Link key={card.id} to={`/cards?card=${card.id}`} className="w-64 shrink-0">
              <CardFace card={card} />
              <div className="mt-2 flex justify-between px-1 text-xs text-muted">
                <span>{card.holderName}</span>
                <span className="num">
                  {money(card.statementSpendCents)} · {percent(card.statementSpendCents, card.monthlyLimitCents)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
