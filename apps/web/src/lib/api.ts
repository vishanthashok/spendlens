import type {
  Budget,
  Card,
  Meta,
  Receipt,
  Suggestion,
  Summary,
  Txn,
  TxnFilters,
  TxnPage,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorText(err: unknown) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Request failed";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) {
        message =
          body.detail
            .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : ""))
            .filter(Boolean)
            .join(", ") || message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

function queryString(filters: TxnFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  meta: () => request<Meta>("/api/meta"),
  summary: () => request<Summary>("/api/summary"),
  cards: () => request<Card[]>("/api/cards"),
  updateLimit: (id: string, monthlyLimitCents: number) =>
    request<Card>(`/api/cards/${id}/limit`, {
      method: "PATCH",
      body: JSON.stringify({ monthlyLimitCents }),
    }),
  updateStatus: (id: string, status: string) =>
    request<Card>(`/api/cards/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateControl: (id: string, mccGroup: string, policy: string) =>
    request<Card>(`/api/cards/${id}/controls`, {
      method: "PATCH",
      body: JSON.stringify({ mccGroup, policy }),
    }),
  transactions: (filters: TxnFilters) => request<TxnPage>(`/api/transactions${queryString(filters)}`),
  transaction: (id: string) => request<Txn>(`/api/transactions/${id}`),
  setCategory: (id: string, category: string) =>
    request<Txn>(`/api/transactions/${id}/category`, {
      method: "PATCH",
      body: JSON.stringify({ category }),
    }),
  categorize: (id: string, apply: boolean) =>
    request<Suggestion>(`/api/transactions/${id}/categorize`, {
      method: "POST",
      body: JSON.stringify({ apply }),
    }),
  budgets: () => request<Budget[]>("/api/budgets"),
  receipts: () => request<Receipt[]>("/api/receipts"),
  matchReceipt: (id: string, transactionId: string) =>
    request<Receipt>(`/api/receipts/${id}/match`, {
      method: "POST",
      body: JSON.stringify({ transactionId }),
    }),
  unmatchReceipt: (id: string) => request<Receipt>(`/api/receipts/${id}/unmatch`, { method: "POST" }),
};
