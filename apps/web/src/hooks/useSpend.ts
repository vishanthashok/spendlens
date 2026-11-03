/**
 * Typed hooks for the SpendLens API.
 *
 * Limit edits, category overrides, merchant controls, and receipt matches
 * write into the React Query cache inside onMutate. Progress bars and table
 * cells update before the response returns. onError restores the previous
 * cache and surfaces the server message.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, errorText } from "../lib/api";
import type { Card, Receipt, Txn, TxnFilters, TxnPage } from "../lib/types";

export const keys = {
  meta: ["meta"] as const,
  summary: ["summary"] as const,
  cards: ["cards"] as const,
  transactions: (filters: TxnFilters) => ["transactions", filters] as const,
  budgets: ["budgets"] as const,
  receipts: ["receipts"] as const,
};

function fail(err: unknown) {
  toast.error(errorText(err));
}

export function useMeta() {
  return useQuery({ queryKey: keys.meta, queryFn: api.meta, staleTime: 60_000 });
}

export function useSummary() {
  return useQuery({ queryKey: keys.summary, queryFn: api.summary });
}

export function useCards() {
  return useQuery({ queryKey: keys.cards, queryFn: api.cards });
}

export function useTransactions(filters: TxnFilters) {
  return useQuery({ queryKey: keys.transactions(filters), queryFn: () => api.transactions(filters) });
}

export function useBudgets() {
  return useQuery({ queryKey: keys.budgets, queryFn: api.budgets });
}

export function useReceipts() {
  return useQuery({ queryKey: keys.receipts, queryFn: api.receipts });
}

function patchCard(card: Card, patch: Partial<Card>): Card {
  return { ...card, ...patch };
}

export function useUpdateCardLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; monthlyLimitCents: number }) =>
      api.updateLimit(vars.id, vars.monthlyLimitCents),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: keys.cards });
      const prev = qc.getQueryData<Card[]>(keys.cards);
      qc.setQueryData<Card[]>(keys.cards, (old) =>
        old?.map((card) =>
          card.id === vars.id ? patchCard(card, { monthlyLimitCents: vars.monthlyLimitCents }) : card,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.cards, ctx.prev);
      fail(err);
    },
    onSuccess: (card) => {
      qc.setQueryData<Card[]>(keys.cards, (old) => old?.map((item) => (item.id === card.id ? card : item)));
      toast.success("Limit updated");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.cards });
      void qc.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useUpdateCardStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: string }) => api.updateStatus(vars.id, vars.status),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: keys.cards });
      const prev = qc.getQueryData<Card[]>(keys.cards);
      qc.setQueryData<Card[]>(keys.cards, (old) =>
        old?.map((card) => (card.id === vars.id ? patchCard(card, { status: vars.status }) : card)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.cards, ctx.prev);
      fail(err);
    },
    onSuccess: (card) => {
      qc.setQueryData<Card[]>(keys.cards, (old) => old?.map((item) => (item.id === card.id ? card : item)));
      toast.success(card.status === "frozen" ? "Card frozen" : "Card reopened");
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.cards }),
  });
}

export function useUpdateCardControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; mccGroup: string; policy: string }) =>
      api.updateControl(vars.id, vars.mccGroup, vars.policy),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: keys.cards });
      const prev = qc.getQueryData<Card[]>(keys.cards);
      qc.setQueryData<Card[]>(keys.cards, (old) =>
        old?.map((card) =>
          card.id === vars.id
            ? patchCard(card, {
                controls: card.controls.map((control) =>
                  control.mccGroup === vars.mccGroup ? { ...control, policy: vars.policy } : control,
                ),
              })
            : card,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.cards, ctx.prev);
      fail(err);
    },
    onSuccess: (card) => {
      qc.setQueryData<Card[]>(keys.cards, (old) => old?.map((item) => (item.id === card.id ? card : item)));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.cards }),
  });
}

function withCategory(txn: Txn, category: string): Txn {
  return { ...txn, category, categorySource: "user", needsReview: false };
}

export function useSetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; category: string }) => api.setCategory(vars.id, vars.category),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const prev = qc.getQueriesData<TxnPage>({ queryKey: ["transactions"] });
      qc.setQueriesData<TxnPage>({ queryKey: ["transactions"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          transactions: old.transactions.map((txn) => (txn.id === vars.id ? withCategory(txn, vars.category) : txn)),
        };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      ctx?.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      fail(err);
    },
    onSuccess: (txn) => {
      qc.setQueriesData<TxnPage>({ queryKey: ["transactions"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          transactions: old.transactions.map((item) => (item.id === txn.id ? txn : item)),
        };
      });
      toast.success(`Saved as ${txn.category}`);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: keys.summary });
      void qc.invalidateQueries({ queryKey: keys.budgets });
    },
  });
}

export function useCategorize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; apply: boolean }) => api.categorize(vars.id, vars.apply),
    onSuccess: (result) => {
      qc.setQueriesData<TxnPage>({ queryKey: ["transactions"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          transactions: old.transactions.map((item) =>
            item.id === result.transaction.id ? result.transaction : item,
          ),
        };
      });
      toast.success(result.applied ? `Applied ${result.category}` : "Suggestion refreshed");
    },
    onError: (err) => fail(err),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: keys.summary });
      void qc.invalidateQueries({ queryKey: keys.budgets });
    },
  });
}

export function useMatchReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { receiptId: string; transactionId: string }) =>
      api.matchReceipt(vars.receiptId, vars.transactionId),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: keys.receipts });
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const prevReceipts = qc.getQueryData<Receipt[]>(keys.receipts);
      const prevTxns = qc.getQueriesData<TxnPage>({ queryKey: ["transactions"] });
      qc.setQueryData<Receipt[]>(keys.receipts, (old) =>
        old?.map((receipt) =>
          receipt.id === vars.receiptId
            ? { ...receipt, status: "matched", transactionId: vars.transactionId, suggestion: null }
            : receipt,
        ),
      );
      qc.setQueriesData<TxnPage>({ queryKey: ["transactions"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          transactions: old.transactions.map((txn) =>
            txn.id === vars.transactionId ? { ...txn, receiptStatus: "matched" } : txn,
          ),
        };
      });
      return { prevReceipts, prevTxns };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevReceipts) qc.setQueryData(keys.receipts, ctx.prevReceipts);
      ctx?.prevTxns.forEach(([key, data]) => qc.setQueryData(key, data));
      fail(err);
    },
    onSuccess: () => toast.success("Receipt matched"),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.receipts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useUnmatchReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: string) => api.unmatchReceipt(receiptId),
    onMutate: async (receiptId) => {
      await qc.cancelQueries({ queryKey: keys.receipts });
      const prevReceipts = qc.getQueryData<Receipt[]>(keys.receipts);
      const current = prevReceipts?.find((receipt) => receipt.id === receiptId);
      qc.setQueryData<Receipt[]>(keys.receipts, (old) =>
        old?.map((receipt) =>
          receipt.id === receiptId
            ? { ...receipt, status: "unmatched", transactionId: null, matched: null }
            : receipt,
        ),
      );
      return { prevReceipts, transactionId: current?.transactionId ?? null };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevReceipts) qc.setQueryData(keys.receipts, ctx.prevReceipts);
      fail(err);
    },
    onSuccess: () => toast.success("Receipt unmatched"),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.receipts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: keys.summary });
    },
  });
}
