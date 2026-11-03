import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { TxnDrawer } from "../components/TxnDrawer";
import { Badge, Button, EmptyBlock, ErrorBlock, Input, LoadingBlock, Select } from "../components/ui";
import { useCards, useMeta, useSetCategory, useTransactions } from "../hooks/useSpend";
import { errorText } from "../lib/api";
import { cn } from "../lib/cn";
import { money, shortDate } from "../lib/format";
import type { Txn, TxnFilters } from "../lib/types";

function CategoryCell({ txn }: { txn: Txn }) {
  const meta = useMeta();
  const setCategory = useSetCategory();
  const categories = meta.data?.categories ?? [txn.category];

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      <select
        aria-label={`Category for ${txn.merchant.name}`}
        className="h-8 max-w-[9.5rem] rounded-full border border-line bg-white px-2 text-xs outline-none focus:border-ink"
        value={txn.category}
        disabled={txn.status === "declined" || setCategory.isPending}
        onChange={(event) => setCategory.mutate({ id: txn.id, category: event.target.value })}
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      {txn.needsReview ? (
        <button
          type="button"
          className="rounded-full bg-lime px-2 py-1 text-[11px] font-medium"
          onClick={() => setCategory.mutate({ id: txn.id, category: txn.category })}
        >
          Confirm
        </button>
      ) : txn.categorySource === "user" ? (
        <Badge tone="moss">You</Badge>
      ) : (
        <Badge tone="quiet">Auto</Badge>
      )}
    </div>
  );
}

export function Transactions() {
  const [params, setParams] = useSearchParams();
  const cards = useCards();
  const meta = useMeta();
  const filters = useMemo<TxnFilters>(
    () => ({
      q: params.get("q") ?? "",
      cardId: params.get("card") ?? "",
      category: params.get("category") ?? "",
      status: params.get("status") ?? "",
      receipt: params.get("receipt") ?? "",
      attention: params.get("attention") ?? "",
    }),
    [params],
  );
  const query = useTransactions(filters);
  const openId = params.get("txn");

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clear = () => {
    const next = new URLSearchParams();
    if (openId) next.set("txn", openId);
    setParams(next, { replace: true });
  };

  if (query.isLoading && !query.data) return <LoadingBlock label="Loading transactions…" />;
  if (query.isError || !query.data) {
    return <ErrorBlock message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  }

  const rows = query.data.transactions;
  const selected = rows.find((txn) => txn.id === openId) ?? null;
  const filtered = Boolean(filters.q || filters.cardId || filters.category || filters.status || filters.receipt || filters.attention);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Ledger</p>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className="font-serif text-4xl tracking-tight">Transactions</h1>
        <p className="text-sm text-muted">{query.data.total} charges</p>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Auto means the model filed it. You means someone confirmed or overrode it. Review means confidence is under 75% — confirm it, or pick another category. The change sticks immediately.
      </p>

      <div className="mt-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <Input
          value={filters.q ?? ""}
          onChange={(event) => setFilter("q", event.target.value)}
          placeholder="Merchant, memo, cardholder, last 4"
          className="lg:max-w-xs"
          aria-label="Search transactions"
        />
        <Select aria-label="Card" value={filters.cardId} onChange={(event) => setFilter("card", event.target.value)}>
          <option value="">All cards</option>
          {cards.data?.map((card) => (
            <option key={card.id} value={card.id}>
              {card.holderName} · {card.last4}
            </option>
          ))}
        </Select>
        <Select aria-label="Category" value={filters.category} onChange={(event) => setFilter("category", event.target.value)}>
          <option value="">All categories</option>
          {meta.data?.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        <Select aria-label="Status" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
          <option value="">Any status</option>
          <option value="posted">Posted</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
        </Select>
        <Select aria-label="Receipt" value={filters.receipt} onChange={(event) => setFilter("receipt", event.target.value)}>
          <option value="">Any receipt</option>
          <option value="matched">Matched</option>
          <option value="missing">Missing</option>
        </Select>
        <Button
          variant={filters.attention === "review" ? "lime" : "outline"}
          onClick={() => setFilter("attention", filters.attention === "review" ? "" : "review")}
        >
          Needs review
        </Button>
        {filtered ? (
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white">
        {rows.length === 0 ? (
          <EmptyBlock
            title="Nothing in this slice."
            body="Clear a filter to see the rest of the ledger."
            action={
              <Button variant="outline" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-faint">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 font-medium">Card</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((txn) => (
                  <tr
                    key={txn.id}
                    className={cn(
                      "cursor-pointer border-b border-line last:border-0 hover:bg-paper/70",
                      openId === txn.id && "bg-paper",
                    )}
                    onClick={() => setFilter("txn", txn.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{shortDate(txn.occurredAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{txn.merchant.name}</div>
                      <div className="text-xs text-faint">{txn.memo || txn.status}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{txn.card.holderName}</div>
                      <div className="num text-xs text-faint">••{txn.card.last4}</div>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryCell txn={txn} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={txn.receiptStatus === "matched" ? "moss" : "review"}>{txn.receiptStatus}</Badge>
                    </td>
                    <td
                      className={cn(
                        "num px-4 py-3 text-right whitespace-nowrap",
                        txn.status === "declined" && "text-danger line-through",
                      )}
                    >
                      {money(txn.amountCents)}
                      {txn.status === "pending" ? <div className="text-[11px] text-warn no-underline">Pending</div> : null}
                      {txn.status === "declined" ? <div className="text-[11px] text-danger no-underline">Declined</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TxnDrawer txn={selected} onClose={() => setFilter("txn", "")} />
    </div>
  );
}
