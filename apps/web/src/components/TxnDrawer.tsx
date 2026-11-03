import { Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useCategorize, useMeta, useSetCategory } from "../hooks/useSpend";
import { clock, money, shortDate } from "../lib/format";
import type { Txn } from "../lib/types";
import { Badge, Button } from "./ui";

export function TxnDrawer({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  const meta = useMeta();
  const setCategory = useSetCategory();
  const categorize = useCategorize();
  const categories = meta.data?.categories ?? [];
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!txn) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [txn]);

  if (!txn) return null;
  const confidence = Math.round(txn.llmConfidence * 100);
  const moved = txn.categorySource === "user" && txn.category !== txn.llmCategory;

  return (
    <div className="fixed inset-0 z-40">
      <button className="absolute inset-0 bg-ink/30" aria-label="Close details" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="txn-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-line bg-[#fffcf7] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-faint">
              {shortDate(txn.occurredAt)} · {clock(txn.occurredAt)}
            </p>
            <h2 id="txn-title" className="mt-1 font-serif text-3xl tracking-tight">
              {txn.merchant.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {txn.merchant.city} · MCC {txn.merchant.mcc}
            </p>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div className={txn.status === "declined" ? "num text-3xl text-danger line-through" : "num text-3xl"}>
            {money(txn.amountCents)}
          </div>
          <Badge tone={txn.status === "declined" ? "danger" : txn.status === "pending" ? "review" : "neutral"}>
            {txn.status}
          </Badge>
        </div>
        {txn.declineReason ? <p className="mt-3 text-sm text-danger">{txn.declineReason}</p> : null}

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-faint">Cardholder</dt>
            <dd className="mt-1">
              {txn.card.holderName}
              <span className="num text-muted"> ·•• {txn.card.last4}</span>
            </dd>
          </div>
          <div>
            <dt className="text-faint">Receipt</dt>
            <dd className="mt-1 capitalize">{txn.receiptStatus}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-faint">Memo</dt>
            <dd className="mt-1">{txn.memo || "No memo on the authorization."}</dd>
          </div>
        </dl>

        <section className="mt-6 rounded-3xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles size={15} />
            Model suggestion
            <span className="num text-faint">{confidence}%</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{txn.llmRationale}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-ink" style={{ width: `${confidence}%` }} />
          </div>
          {moved ? (
            <p className="mt-3 text-sm">
              You moved this from {txn.llmCategory} to {txn.category}.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {txn.needsReview ? (
              <Button
                size="sm"
                variant="lime"
                disabled={setCategory.isPending}
                onClick={() => setCategory.mutate({ id: txn.id, category: txn.category })}
              >
                Confirm {txn.category}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={categorize.isPending}
              onClick={() => categorize.mutate({ id: txn.id, apply: false })}
            >
              Re-run model
            </Button>
            {txn.category !== txn.llmCategory ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={setCategory.isPending}
                onClick={() => setCategory.mutate({ id: txn.id, category: txn.llmCategory })}
              >
                Use {txn.llmCategory}
              </Button>
            ) : null}
          </div>
        </section>

        {txn.status !== "declined" ? (
          <section className="mt-5">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-faint">One-click category</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => {
                const current = category === txn.category;
                return (
                  <button
                    key={category}
                    type="button"
                    disabled={current || setCategory.isPending}
                    onClick={() => setCategory.mutate({ id: txn.id, category })}
                    className={
                      current
                        ? "rounded-full bg-ink px-3 py-1.5 text-sm text-white"
                        : "rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-ink"
                    }
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
