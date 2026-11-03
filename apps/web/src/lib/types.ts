export type Merchant = {
  id: string;
  name: string;
  mccGroup: string;
  mcc: string;
  city: string;
  monogram: string;
};

export type CardRef = {
  id: string;
  holderName: string;
  holderRole: string;
  department: string;
  last4: string;
  tone: string;
};

export type Control = {
  mccGroup: string;
  label: string;
  policy: "allowed" | "review" | "blocked" | string;
};

export type Card = {
  id: string;
  holderName: string;
  holderRole: string;
  department: string;
  last4: string;
  network: string;
  status: "active" | "frozen" | string;
  monthlyLimitCents: number;
  nickname: string;
  tone: string;
  statementSpendCents: number;
  sinceCloseCents: number;
  controls: Control[];
};

export type Txn = {
  id: string;
  amountCents: number;
  occurredAt: string;
  status: "posted" | "pending" | "declined" | string;
  declineReason: string | null;
  memo: string;
  category: string;
  categorySource: "llm" | "user" | string;
  llmCategory: string;
  llmConfidence: number;
  llmRationale: string;
  needsReview: boolean;
  receiptStatus: "matched" | "missing" | string;
  receiptId: string | null;
  budgetId: string | null;
  card: CardRef;
  merchant: Merchant;
};

export type TxnPage = {
  transactions: Txn[];
  total: number;
};

export type TxnFilters = {
  q?: string;
  cardId?: string;
  category?: string;
  status?: string;
  receipt?: string;
  attention?: string;
};

export type Budget = {
  id: string;
  name: string;
  department: string;
  owner: string;
  periodLabel: string;
  limitCents: number;
  actualCents: number;
  varianceCents: number;
  categories: string[];
};

export type Attention = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
};

export type Summary = {
  companyName: string;
  teamLabel: string;
  periodLabel: string;
  spendCents: number;
  budgetCents: number;
  varianceCents: number;
  receiptsMissing: number;
  cardsNearLimit: number;
  needsReview: number;
  sinceCloseCents: number;
  transactionCount: number;
  daily: { date: string; spendCents: number }[];
  byCategory: { category: string; spendCents: number }[];
  budgets: Budget[];
  attention: Attention[];
};

export type Receipt = {
  id: string;
  vendor: string;
  amountCents: number;
  receiptDate: string;
  uploadedBy: string;
  fileName: string;
  note: string;
  status: "matched" | "unmatched" | string;
  transactionId: string | null;
  matchScore: number | null;
  suggestion: Txn | null;
  matched: Txn | null;
};

export type Suggestion = {
  category: string;
  confidence: number;
  rationale: string;
  applied: boolean;
  transaction: Txn;
};

export type Meta = {
  companyName: string;
  teamLabel: string;
  periodLabel: string;
  categories: string[];
  policies: string[];
};
