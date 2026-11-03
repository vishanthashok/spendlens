"""Read and write the ledger. Amounts are integer cents."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.categorize import CATEGORIES, Suggestion, needs_review, suggest
from app.models import Budget, Card, CategoryControl, Merchant, Receipt, Transaction
from app.schemas import (
    AttentionItem,
    BudgetOut,
    CardOut,
    CardRef,
    CategoryPoint,
    ControlOut,
    DailyPoint,
    MerchantOut,
    MetaOut,
    ReceiptOut,
    SummaryOut,
    TxnOut,
    TxnPage,
)
from app.seed import BUDGET_SPECS, COMPANY, GROUPS, PERIOD_LABEL, TEAM, budget_for

PERIOD_START = datetime(2026, 10, 1)
PERIOD_END = datetime(2026, 11, 1)
NEAR_LIMIT = 0.8


def money(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    cents = abs(int(cents))
    return f"{sign}${cents // 100:,}.{cents % 100:02d}"


def _merchant_out(merchant: Merchant) -> MerchantOut:
    return MerchantOut(
        id=merchant.id,
        name=merchant.name,
        mccGroup=merchant.mcc_group,
        mcc=merchant.mcc,
        city=merchant.city,
        monogram=merchant.monogram,
    )


def _card_ref(card: Card) -> CardRef:
    return CardRef(
        id=card.id,
        holderName=card.holder_name,
        holderRole=card.holder_role,
        department=card.department,
        last4=card.last4,
        tone=card.tone,
    )


def txn_out(txn: Transaction) -> TxnOut:
    return TxnOut(
        id=txn.id,
        amountCents=txn.amount_cents,
        occurredAt=txn.occurred_at.isoformat(timespec="minutes"),
        status=txn.status,
        declineReason=txn.decline_reason,
        memo=txn.memo,
        category=txn.category,
        categorySource=txn.category_source,
        llmCategory=txn.llm_category,
        llmConfidence=txn.llm_confidence,
        llmRationale=txn.llm_rationale,
        needsReview=needs_review(txn.category_source, txn.llm_confidence, txn.status),
        receiptStatus=txn.receipt_status,
        receiptId=txn.receipt.id if txn.receipt else None,
        budgetId=txn.budget_id,
        card=_card_ref(txn.card),
        merchant=_merchant_out(txn.merchant),
    )


def _spend(session: Session, card_id: str, start: datetime, end: datetime | None) -> int:
    query = session.query(func.coalesce(func.sum(Transaction.amount_cents), 0)).filter(
        Transaction.card_id == card_id,
        Transaction.status != "declined",
        Transaction.occurred_at >= start,
    )
    if end is not None:
        query = query.filter(Transaction.occurred_at < end)
    return int(query.scalar() or 0)


def _controls(card: Card) -> list[ControlOut]:
    by_group = {c.mcc_group: c for c in card.controls}
    ordered = []
    for group, label in GROUPS:
        row = by_group.get(group)
        if row:
            ordered.append(ControlOut(mccGroup=row.mcc_group, label=row.label, policy=row.policy))
        else:
            ordered.append(ControlOut(mccGroup=group, label=label, policy="allowed"))
    return ordered


def card_out(session: Session, card: Card) -> CardOut:
    return CardOut(
        id=card.id,
        holderName=card.holder_name,
        holderRole=card.holder_role,
        department=card.department,
        last4=card.last4,
        network=card.network,
        status=card.status,
        monthlyLimitCents=card.monthly_limit_cents,
        nickname=card.nickname,
        tone=card.tone,
        statementSpendCents=_spend(session, card.id, PERIOD_START, PERIOD_END),
        sinceCloseCents=_spend(session, card.id, PERIOD_END, None),
        controls=_controls(card),
    )


def list_cards(session: Session) -> list[CardOut]:
    cards = session.query(Card).options(joinedload(Card.controls)).all()
    # joinedload can duplicate rows on some backends
    unique: dict[str, Card] = {}
    for card in cards:
        unique[card.id] = card
    payload = [card_out(session, card) for card in unique.values()]
    payload.sort(key=lambda c: (c.statementSpendCents / c.monthlyLimitCents) if c.monthlyLimitCents else 0, reverse=True)
    return payload


def get_card(session: Session, card_id: str) -> Card:
    card = session.query(Card).options(joinedload(Card.controls)).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def update_limit(session: Session, card_id: str, monthly_limit_cents: int) -> CardOut:
    card = get_card(session, card_id)
    spend = _spend(session, card.id, PERIOD_START, PERIOD_END)
    if monthly_limit_cents < spend:
        raise HTTPException(
            status_code=400,
            detail=f"Limit can't sit below October spend of {money(spend)}.",
        )
    card.monthly_limit_cents = monthly_limit_cents
    session.commit()
    session.refresh(card)
    return card_out(session, card)


def update_status(session: Session, card_id: str, status: str) -> CardOut:
    card = get_card(session, card_id)
    card.status = status
    session.commit()
    session.refresh(card)
    return card_out(session, card)


def update_control(session: Session, card_id: str, mcc_group: str, policy: str) -> CardOut:
    card = get_card(session, card_id)
    control = next((c for c in card.controls if c.mcc_group == mcc_group), None)
    if not control:
        raise HTTPException(status_code=404, detail="Merchant category not found on this card")
    control.policy = policy
    session.commit()
    session.refresh(card)
    return card_out(session, card)


def _txn_query(session: Session):
    return (
        session.query(Transaction)
        .join(Transaction.merchant)
        .join(Transaction.card)
        .options(
            contains_eager(Transaction.merchant),
            contains_eager(Transaction.card),
            joinedload(Transaction.receipt),
        )
    )


def get_txn(session: Session, txn_id: str) -> Transaction:
    txn = _txn_query(session).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


def list_transactions(
    session: Session,
    q: str | None = None,
    card_id: str | None = None,
    category: str | None = None,
    status: str | None = None,
    receipt: str | None = None,
    attention: str | None = None,
) -> TxnPage:
    query = _txn_query(session)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter(
            func.lower(Merchant.name).like(like)
            | func.lower(Card.holder_name).like(like)
            | func.lower(Transaction.memo).like(like)
            | func.lower(Transaction.category).like(like)
            | Card.last4.like(f"%{q.strip()}%")
        )
    if card_id:
        query = query.filter(Transaction.card_id == card_id)
    if category:
        query = query.filter(Transaction.category == category)
    if status:
        query = query.filter(Transaction.status == status)
    if receipt:
        query = query.filter(Transaction.receipt_status == receipt)
    if attention == "review":
        query = query.filter(
            Transaction.category_source != "user",
            Transaction.llm_confidence < 0.75,
            Transaction.status != "declined",
        )
    rows = query.order_by(Transaction.occurred_at.desc()).all()
    payload = [txn_out(row) for row in rows]
    return TxnPage(transactions=payload, total=len(payload))


def set_category(session: Session, txn_id: str, category: str) -> TxnOut:
    if category not in CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Unknown category '{category}'.")
    txn = get_txn(session, txn_id)
    if txn.status == "declined":
        raise HTTPException(status_code=400, detail="Declined charges aren't categorized.")
    txn.category = category
    txn.category_source = "user"
    txn.budget_id = budget_for(category)
    session.commit()
    return txn_out(get_txn(session, txn_id))


def rerun_categorizer(session: Session, txn_id: str, apply: bool) -> tuple[Suggestion, TxnOut]:
    txn = get_txn(session, txn_id)
    suggestion = suggest(txn.merchant.name, txn.merchant.mcc_group, txn.merchant.mcc)
    txn.llm_category = suggestion.category
    txn.llm_confidence = suggestion.confidence
    txn.llm_rationale = suggestion.rationale
    applied = apply and txn.status != "declined"
    if applied:
        txn.category = suggestion.category
        txn.category_source = "llm"
        txn.budget_id = budget_for(suggestion.category)
    session.commit()
    fresh = get_txn(session, txn_id)
    return suggestion, txn_out(fresh)


def _budget_actuals(session: Session) -> dict[str, int]:
    rows = (
        session.query(Transaction.budget_id, func.coalesce(func.sum(Transaction.amount_cents), 0))
        .filter(
            Transaction.status != "declined",
            Transaction.occurred_at >= PERIOD_START,
            Transaction.occurred_at < PERIOD_END,
            Transaction.budget_id.is_not(None),
        )
        .group_by(Transaction.budget_id)
        .all()
    )
    return {bid: int(total) for bid, total in rows if bid}


def budget_out(budget: Budget, actual: int) -> BudgetOut:
    cats = next(spec[4] for spec in BUDGET_SPECS if spec[0] == budget.id)
    return BudgetOut(
        id=budget.id,
        name=budget.name,
        department=budget.department,
        owner=budget.owner,
        periodLabel=budget.period_label,
        limitCents=budget.limit_cents,
        actualCents=actual,
        varianceCents=budget.limit_cents - actual,
        categories=list(cats),
    )


def list_budgets(session: Session) -> list[BudgetOut]:
    actuals = _budget_actuals(session)
    order = [spec[0] for spec in BUDGET_SPECS]
    budgets = {b.id: b for b in session.query(Budget).all()}
    return [budget_out(budgets[bid], actuals.get(bid, 0)) for bid in order if bid in budgets]


def _period_txns(session: Session) -> list[Transaction]:
    return (
        _txn_query(session)
        .filter(Transaction.occurred_at >= PERIOD_START, Transaction.occurred_at < PERIOD_END)
        .all()
    )


def summary(session: Session) -> SummaryOut:
    period = _period_txns(session)
    spending = [t for t in period if t.status != "declined"]
    spend = sum(t.amount_cents for t in spending)
    budgets = list_budgets(session)
    budget_total = sum(b.limitCents for b in budgets)
    missing = [t for t in spending if t.receipt_status == "missing"]
    review = [t for t in spending if needs_review(t.category_source, t.llm_confidence, t.status)]
    cards = list_cards(session)
    near = [c for c in cards if c.monthlyLimitCents and c.statementSpendCents / c.monthlyLimitCents >= NEAR_LIMIT]
    since = int(
        session.query(func.coalesce(func.sum(Transaction.amount_cents), 0))
        .filter(Transaction.status != "declined", Transaction.occurred_at >= PERIOD_END)
        .scalar()
        or 0
    )

    by_day: dict[str, int] = {}
    day = PERIOD_START
    while day < PERIOD_END:
        by_day[day.date().isoformat()] = 0
        day += timedelta(days=1)
    for txn in spending:
        key = txn.occurred_at.date().isoformat()
        by_day[key] = by_day.get(key, 0) + txn.amount_cents

    by_cat: dict[str, int] = {}
    for txn in spending:
        by_cat[txn.category] = by_cat.get(txn.category, 0) + txn.amount_cents

    attention: list[AttentionItem] = []
    for txn in sorted(review, key=lambda t: t.llm_confidence)[:3]:
        attention.append(
            AttentionItem(
                id=f"review-{txn.id}",
                kind="review",
                title=f"{txn.merchant.name} needs a category",
                detail=f"Model says {txn.llm_category} at {round(txn.llm_confidence * 100)}% confidence.",
                href=f"/transactions?attention=review&txn={txn.id}",
            )
        )
    for txn in sorted(missing, key=lambda t: t.amount_cents, reverse=True)[:2]:
        attention.append(
            AttentionItem(
                id=f"receipt-{txn.id}",
                kind="receipt",
                title=f"No receipt for {txn.merchant.name}",
                detail=f"{money(txn.amount_cents)} on {txn.card.holder_name}'s card.",
                href=f"/transactions?receipt=missing&txn={txn.id}",
            )
        )
    for card in near[:2]:
        ratio = card.statementSpendCents / card.monthlyLimitCents
        attention.append(
            AttentionItem(
                id=f"limit-{card.id}",
                kind="limit",
                title=f"{card.holderName} is at {round(ratio * 100)}% of limit",
                detail=f"{money(card.statementSpendCents)} of {money(card.monthlyLimitCents)} on {card.nickname}.",
                href=f"/cards?card={card.id}",
            )
        )
    for budget in budgets:
        if budget.actualCents > budget.limitCents:
            attention.append(
                AttentionItem(
                    id=f"budget-{budget.id}",
                    kind="budget",
                    title=f"{budget.name} is over plan",
                    detail=f"{money(budget.actualCents - budget.limitCents)} past the October budget.",
                    href="/budgets",
                )
            )
            break

    return SummaryOut(
        companyName=COMPANY,
        teamLabel=TEAM,
        periodLabel=PERIOD_LABEL,
        spendCents=spend,
        budgetCents=budget_total,
        varianceCents=budget_total - spend,
        receiptsMissing=len(missing),
        cardsNearLimit=len(near),
        needsReview=len(review),
        sinceCloseCents=since,
        transactionCount=len(spending),
        daily=[DailyPoint(date=d, spendCents=v) for d, v in by_day.items()],
        byCategory=[
            CategoryPoint(category=name, spendCents=cents)
            for name, cents in sorted(by_cat.items(), key=lambda item: item[1], reverse=True)
        ],
        budgets=budgets,
        attention=attention[:7],
    )


def _receipt_out(session: Session, receipt: Receipt) -> ReceiptOut:
    suggestion = None
    if receipt.suggested_transaction_id and receipt.status != "matched":
        suggested = (
            _txn_query(session).filter(Transaction.id == receipt.suggested_transaction_id).first()
        )
        if suggested:
            suggestion = txn_out(suggested)
    matched = None
    if receipt.transaction_id:
        linked = _txn_query(session).filter(Transaction.id == receipt.transaction_id).first()
        if linked:
            matched = txn_out(linked)
    return ReceiptOut(
        id=receipt.id,
        vendor=receipt.vendor,
        amountCents=receipt.amount_cents,
        receiptDate=receipt.receipt_date.isoformat(timespec="minutes"),
        uploadedBy=receipt.uploaded_by,
        fileName=receipt.file_name,
        note=receipt.note,
        status=receipt.status,
        transactionId=receipt.transaction_id,
        matchScore=receipt.match_score,
        suggestion=suggestion,
        matched=matched,
    )


def list_receipts(session: Session) -> list[ReceiptOut]:
    rows = session.query(Receipt).order_by(Receipt.receipt_date.desc()).all()
    unmatched = [r for r in rows if r.status != "matched"]
    matched = [r for r in rows if r.status == "matched"]
    return [_receipt_out(session, r) for r in unmatched + matched]


def match_receipt(session: Session, receipt_id: str, transaction_id: str) -> ReceiptOut:
    receipt = session.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    txn = get_txn(session, transaction_id)
    if txn.status == "declined":
        raise HTTPException(status_code=400, detail="Declined charges don't take receipts.")
    previous = (
        session.query(Receipt)
        .filter(Receipt.transaction_id == txn.id, Receipt.id != receipt.id)
        .one_or_none()
    )
    if previous:
        previous.transaction_id = None
        previous.status = "unmatched"
        session.flush()
    if receipt.transaction_id and receipt.transaction_id != txn.id:
        old = session.get(Transaction, receipt.transaction_id)
        if old:
            old.receipt_status = "missing"
    receipt.transaction_id = txn.id
    receipt.status = "matched"
    txn.receipt_status = "matched"
    session.commit()
    session.refresh(receipt)
    return _receipt_out(session, receipt)


def unmatch_receipt(session: Session, receipt_id: str) -> ReceiptOut:
    receipt = session.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.transaction_id:
        txn = session.get(Transaction, receipt.transaction_id)
        if txn:
            txn.receipt_status = "missing"
    receipt.transaction_id = None
    receipt.status = "unmatched"
    session.commit()
    session.refresh(receipt)
    return _receipt_out(session, receipt)


def meta() -> MetaOut:
    return MetaOut(
        companyName=COMPANY,
        teamLabel=TEAM,
        periodLabel=PERIOD_LABEL,
        categories=list(CATEGORIES),
        policies=["allowed", "review", "blocked"],
    )

