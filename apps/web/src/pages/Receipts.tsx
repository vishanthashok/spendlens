import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { Button, EmptyBlock, ErrorBlock, LoadingBlock, Select } from "../components/ui";
import { useMatchReceipt, useReceipts, useTransactions, useUnmatchReceipt } from "../hooks/useSpend";
import { errorText } from "../lib/api";
import { cn } from "../lib/cn";
import { money, shortDate } from "../lib/format";
import type { Receipt } from "../lib/types";

function Paper({ receipt, active }: { receipt: Receipt; active?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed bg-[#fffdf8] px-4 py-4 text-left shadow-sm",
        active ? "border-ink" : "border-line",
      )}
    >
      <div className="text-center">
        <div className="text-base font-semibold">{receipt.vendor}</div>
        <div className="text-xs text-faint">{receipt.fileName}</div>
      </div>
      <div className="my-3 border-t border-dashed border-line" />
      <div className="flex items-baseline justify-between text-sm">
        <span>{shortDate(receipt.receiptDate)}</span>
        <span className="num">{money(receipt.amountCents)}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{receipt.note}</p>
      <div className="mt-3 text-[11px] uppercase tracking-[0.12em] text-faint">Uploaded by {receipt.uploadedBy}</div>
    </div>
  );
}

export function Receipts() {
  const [params, setParams] = useSearchParams();
  const receipts = useReceipts();
  const missing = useTransactions({ receipt: "missing" });
  const match = useMatchReceipt();
  const unmatch = useUnmatchReceipt();

  const unmatched = useMemo(
    () => (receipts.data ?? []).filter((receipt) => receipt.status !== "matched"),
    [receipts.data],
  );
  const matched = useMemo(
    () => (receipts.data ?? []).filter((receipt) => receipt.status === "matched").slice(0, 6),
    [receipts.data],
  );
  const selectedId = params.get("receipt") ?? unmatched[0]?.id ?? "";
  const selected = unmatched.find((receipt) => receipt.id === selectedId) ?? unmatched[0];

  if (receipts.isLoading) return <LoadingBlock label="Loading receipts…" />;
  if (receipts.isError || !receipts.data) {
    return <ErrorBlock message={errorText(receipts.error)} onRetry={() => void receipts.refetch()} />;
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Inbox</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Receipts</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Uploads that don't have a charge yet. When the amount, merchant, and date line up, SpendLens suggests the match. Confirm it in one click.
      </p>

      {unmatched.length === 0 ? (
        <div className="mt-6">
          <EmptyBlock title="Inbox is clear." body="Every uploaded receipt is attached to a charge." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {unmatched.map((receipt) => (
              <button
                key={receipt.id}
                type="button"
                className="block w-full"
                onClick={() => setParams({ receipt: receipt.id }, { replace: true })}
              >
                <Paper receipt={receipt} active={receipt.id === selected?.id} />
              </button>
            ))}
          </div>

          {selected ? (
            <section className="h-fit rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-6">
              <h2 className="font-medium">Suggested match</h2>
              {selected.suggestion ? (
                <>
                  <p className="mt-2 text-sm text-muted">
                    {selected.suggestion.merchant.name} on {selected.suggestion.card.holderName}'s card,{" "}
                    {shortDate(selected.suggestion.occurredAt)}, {money(selected.suggestion.amountCents)}.
                  </p>
                  <p className="num mt-2 text-sm text-moss">
                    {Math.round((selected.matchScore ?? 0) * 100)}% match
                  </p>
                  <Button
                    className="mt-4"
                    disabled={match.isPending}
                    onClick={() =>
                      match.mutate({
                        receiptId: selected.id,
                        transactionId: selected.suggestion?.id ?? "",
                      })
                    }
                  >
                    Match this charge
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">No charge lines up cleanly with this upload.</p>
              )}

              <label className="mt-6 block text-[11px] uppercase tracking-[0.14em] text-faint" htmlFor="manual-match">
                Or pick a charge that's missing a receipt
              </label>
              <Select
                id="manual-match"
                key={selected.id}
                className="mt-2 w-full"
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  match.mutate({ receiptId: selected.id, transactionId: event.target.value });
                  event.target.value = "";
                }}
              >
                <option value="">Choose a charge…</option>
                {(missing.data?.transactions ?? []).map((txn) => (
                  <option key={txn.id} value={txn.id}>
                    {shortDate(txn.occurredAt)} · {txn.merchant.name} · {money(txn.amountCents)}
                  </option>
                ))}
              </Select>
            </section>
          ) : null}
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-medium">Recently matched</h2>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
          {matched.map((receipt) => (
            <li key={receipt.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">{receipt.vendor}</div>
                <div className="text-xs text-muted">
                  {money(receipt.amountCents)} · {receipt.uploadedBy}
                  {receipt.matched ? ` · ${receipt.matched.card.holderName}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled={unmatch.isPending} onClick={() => unmatch.mutate(receipt.id)}>
                Unmatch
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
