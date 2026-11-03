from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MerchantOut(BaseModel):
    id: str
    name: str
    mccGroup: str
    mcc: str
    city: str
    monogram: str


class CardRef(BaseModel):
    id: str
    holderName: str
    holderRole: str
    department: str
    last4: str
    tone: str


class ControlOut(BaseModel):
    mccGroup: str
    label: str
    policy: str


class CardOut(BaseModel):
    id: str
    holderName: str
    holderRole: str
    department: str
    last4: str
    network: str
    status: str
    monthlyLimitCents: int
    nickname: str
    tone: str
    statementSpendCents: int
    sinceCloseCents: int
    controls: list[ControlOut]


class TxnOut(BaseModel):
    id: str
    amountCents: int
    occurredAt: str
    status: str
    declineReason: str | None
    memo: str
    category: str
    categorySource: str
    llmCategory: str
    llmConfidence: float
    llmRationale: str
    needsReview: bool
    receiptStatus: str
    receiptId: str | None
    budgetId: str | None
    card: CardRef
    merchant: MerchantOut


class TxnPage(BaseModel):
    transactions: list[TxnOut]
    total: int


class BudgetOut(BaseModel):
    id: str
    name: str
    department: str
    owner: str
    periodLabel: str
    limitCents: int
    actualCents: int
    varianceCents: int
    categories: list[str]


class DailyPoint(BaseModel):
    date: str
    spendCents: int


class CategoryPoint(BaseModel):
    category: str
    spendCents: int


class AttentionItem(BaseModel):
    id: str
    kind: str
    title: str
    detail: str
    href: str


class SummaryOut(BaseModel):
    companyName: str
    teamLabel: str
    periodLabel: str
    spendCents: int
    budgetCents: int
    varianceCents: int
    receiptsMissing: int
    cardsNearLimit: int
    needsReview: int
    sinceCloseCents: int
    transactionCount: int
    daily: list[DailyPoint]
    byCategory: list[CategoryPoint]
    budgets: list[BudgetOut]
    attention: list[AttentionItem]


class ReceiptOut(BaseModel):
    id: str
    vendor: str
    amountCents: int
    receiptDate: str
    uploadedBy: str
    fileName: str
    note: str
    status: str
    transactionId: str | None
    matchScore: float | None
    suggestion: TxnOut | None
    matched: TxnOut | None


class SuggestionOut(BaseModel):
    category: str
    confidence: float
    rationale: str
    applied: bool
    transaction: TxnOut


class MetaOut(BaseModel):
    companyName: str
    teamLabel: str
    periodLabel: str
    categories: list[str]
    policies: list[str]


class LimitIn(BaseModel):
    monthlyLimitCents: int = Field(ge=0, le=50_000_000)


class StatusIn(BaseModel):
    status: Literal["active", "frozen"]


class ControlIn(BaseModel):
    mccGroup: str
    policy: Literal["allowed", "review", "blocked"]


class CategoryIn(BaseModel):
    category: str


class ApplyIn(BaseModel):
    apply: bool = False


class MatchIn(BaseModel):
    transactionId: str
