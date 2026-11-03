import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { CardFace } from "../components/CardFace";
import { Button, ErrorBlock, LoadingBlock, Meter } from "../components/ui";
import { useCards, useTransactions, useUpdateCardControl, useUpdateCardLimit, useUpdateCardStatus } from "../hooks/useSpend";
import { errorText } from "../lib/api";
import { cn } from "../lib/cn";
import { money, percent, shortDate } from "../lib/format";

const POLICIES = [
  { id: "allowed", label: "Allow" },
  { id: "review", label: "Review" },
  { id: "blocked", label: "Block" },
];

export function Cards() {
  const [params, setParams] = useSearchParams();
  const cards = useCards();
  const updateLimit = useUpdateCardLimit();
  const updateStatus = useUpdateCardStatus();
  const updateControl = useUpdateCardControl();

  const selectedId = params.get("card") ?? cards.data?.[0]?.id ?? "";
  const card = cards.data?.find((item) => item.id === selectedId) ?? cards.data?.[0];
  const recent = useTransactions(card ? { cardId: card.id } : {});
  const [draft, setDraft] = useState<{ id: string; dollars: number } | null>(null);
  const dollars =
    draft && card && draft.id === card.id ? draft.dollars : Math.round((card?.monthlyLimitCents ?? 0) / 100);
  const setDollars = (next: number) => {
    if (!card) return;
    setDraft({ id: card.id, dollars: next });
  };

  if (cards.isLoading) return <LoadingBlock label="Loading cards…" />;
  if (cards.isError || !cards.data || !card) {
    return <ErrorBlock message={errorText(cards.error)} onRetry={() => void cards.refetch()} />;
  }

  const draftCents = Math.round(dollars * 100);
  const dirty = draftCents !== card.monthlyLimitCents;
  const belowSpend = draftCents < card.statementSpendCents;
  const preview = { ...card, monthlyLimitCents: draftCents };

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Controls</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Cards</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Each card has a statement limit and a merchant-category policy. Saving a limit updates the card before the server answers. A limit under October spend stays disabled until it covers what's already been spent.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-2">
          {cards.data.map((item) => {
            const active = item.id === card.id;
            const used = percent(item.statementSpendCents, item.monthlyLimitCents);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setParams({ card: item.id }, { replace: true })}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left",
                  active ? "border-ink bg-white" : "border-line bg-white/60 hover:bg-white",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.holderName}</div>
                    <div className="text-xs text-muted">
                      {item.holderRole} ·•• {item.last4}
                    </div>
                  </div>
                  <div className={cn("num text-sm", used >= 80 ? "text-warn" : "text-muted")}>{used}%</div>
                </div>
                <Meter className="mt-3" value={item.statementSpendCents} max={item.monthlyLimitCents} />
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <CardFace card={preview} />
          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">October limit</h2>
                <p className="mt-1 text-sm text-muted">
                  {money(card.statementSpendCents)} spent
                  {card.sinceCloseCents > 0 ? ` · ${money(card.sinceCloseCents)} since close, not on this statement` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ id: card.id, status: card.status === "frozen" ? "active" : "frozen" })
                }
              >
                {card.status === "frozen" ? "Reopen card" : "Freeze card"}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={20000}
                step={50}
                value={Math.min(dollars, 20000)}
                aria-label="Monthly limit"
                className="w-full"
                onChange={(event) => setDollars(Number(event.target.value))}
              />
              <label className="sr-only" htmlFor="limit-dollars">
                Limit in dollars
              </label>
              <input
                id="limit-dollars"
                inputMode="numeric"
                className="num h-10 w-28 rounded-full border border-line px-3 text-right text-sm outline-none focus:border-ink"
                value={dollars}
                onChange={(event) => setDollars(Number(event.target.value.replace(/[^\d.]/g, "")) || 0)}
              />
            </div>
            {belowSpend ? (
              <p className="mt-3 text-sm text-danger">
                October spend is already {money(card.statementSpendCents)}. The limit has to cover it.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">Applies to new authorizations on this statement.</p>
            )}
            <Button
              className="mt-4"
              disabled={!dirty || belowSpend || updateLimit.isPending}
              onClick={() => updateLimit.mutate({ id: card.id, monthlyLimitCents: draftCents })}
            >
              {updateLimit.isPending ? "Saving…" : "Save limit"}
            </Button>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="font-medium">Merchant categories</h2>
            <p className="mt-1 text-sm text-muted">
              Block stops the authorization. Review lets it post and flags it. Allow is silent. Changes apply to new charges.
            </p>
            <ul className="mt-4 divide-y divide-line">
              {card.controls.map((control) => (
                <li key={control.mccGroup} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">{control.label}</div>
                  <div className="grid grid-cols-3 rounded-full border border-line p-0.5 text-xs">
                    {POLICIES.map((policy) => {
                      const active = control.policy === policy.id;
                      return (
                        <button
                          key={policy.id}
                          type="button"
                          disabled={updateControl.isPending && active}
                          onClick={() =>
                            updateControl.mutate({ id: card.id, mccGroup: control.mccGroup, policy: policy.id })
                          }
                          className={cn(
                            "rounded-full px-3 py-1.5",
                            active && policy.id === "blocked" && "bg-danger text-white",
                            active && policy.id === "review" && "bg-amber text-ink",
                            active && policy.id === "allowed" && "bg-ink text-white",
                            !active && "text-muted hover:text-ink",
                          )}
                        >
                          {policy.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="font-medium">Recent charges</h2>
            <ul className="mt-3 divide-y divide-line">
              {(recent.data?.transactions ?? []).slice(0, 6).map((txn) => (
                <li key={txn.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <div>{txn.merchant.name}</div>
                    <div className="text-xs text-faint">
                      {shortDate(txn.occurredAt)} · {txn.category}
                    </div>
                  </div>
                  <div className={cn("num", txn.status === "declined" && "text-danger line-through")}>
                    {money(txn.amountCents)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
