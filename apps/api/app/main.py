from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine, get_session
from app.schemas import (
    ApplyIn,
    BudgetOut,
    CardOut,
    CategoryIn,
    ControlIn,
    LimitIn,
    MatchIn,
    MetaOut,
    ReceiptOut,
    StatusIn,
    SuggestionOut,
    SummaryOut,
    TxnOut,
    TxnPage,
)
from app.seed import seed
from app.services import (
    list_budgets,
    list_cards,
    list_receipts,
    list_transactions,
    match_receipt,
    meta,
    rerun_categorizer,
    set_category,
    summary,
    unmatch_receipt,
    update_control,
    update_limit,
    update_status,
    get_txn,
    txn_out,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed(session)
    finally:
        session.close()
    yield


app = FastAPI(title="SpendLens API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    backend = "sqlite" if str(engine.url).startswith("sqlite") else "postgres"
    return {"ok": True, "database": backend}


@app.get("/api/meta", response_model=MetaOut)
def get_meta():
    return meta()


@app.get("/api/summary", response_model=SummaryOut)
def get_summary(session: Session = Depends(get_session)):
    return summary(session)


@app.get("/api/cards", response_model=list[CardOut])
def get_cards(session: Session = Depends(get_session)):
    return list_cards(session)


@app.patch("/api/cards/{card_id}/limit", response_model=CardOut)
def patch_limit(card_id: str, body: LimitIn, session: Session = Depends(get_session)):
    return update_limit(session, card_id, body.monthlyLimitCents)


@app.patch("/api/cards/{card_id}/status", response_model=CardOut)
def patch_status(card_id: str, body: StatusIn, session: Session = Depends(get_session)):
    return update_status(session, card_id, body.status)


@app.patch("/api/cards/{card_id}/controls", response_model=CardOut)
def patch_control(card_id: str, body: ControlIn, session: Session = Depends(get_session)):
    return update_control(session, card_id, body.mccGroup, body.policy)


@app.get("/api/transactions", response_model=TxnPage)
def get_transactions(
    q: str | None = None,
    cardId: str | None = None,
    category: str | None = None,
    status: str | None = None,
    receipt: str | None = None,
    attention: str | None = None,
    session: Session = Depends(get_session),
):
    return list_transactions(session, q, cardId, category, status, receipt, attention)


@app.get("/api/transactions/{txn_id}", response_model=TxnOut)
def get_transaction(txn_id: str, session: Session = Depends(get_session)):
    return txn_out(get_txn(session, txn_id))


@app.patch("/api/transactions/{txn_id}/category", response_model=TxnOut)
def patch_category(txn_id: str, body: CategoryIn, session: Session = Depends(get_session)):
    return set_category(session, txn_id, body.category)


@app.post("/api/transactions/{txn_id}/categorize", response_model=SuggestionOut)
def categorize(txn_id: str, body: ApplyIn, session: Session = Depends(get_session)):
    suggestion, txn = rerun_categorizer(session, txn_id, body.apply)
    applied = body.apply and txn.status != "declined" and txn.category == suggestion.category and txn.categorySource == "llm"
    return SuggestionOut(
        category=suggestion.category,
        confidence=suggestion.confidence,
        rationale=suggestion.rationale,
        applied=applied,
        transaction=txn,
    )


@app.get("/api/budgets", response_model=list[BudgetOut])
def get_budgets(session: Session = Depends(get_session)):
    return list_budgets(session)


@app.get("/api/receipts", response_model=list[ReceiptOut])
def get_receipts(session: Session = Depends(get_session)):
    return list_receipts(session)


@app.post("/api/receipts/{receipt_id}/match", response_model=ReceiptOut)
def post_match(receipt_id: str, body: MatchIn, session: Session = Depends(get_session)):
    return match_receipt(session, receipt_id, body.transactionId)


@app.post("/api/receipts/{receipt_id}/unmatch", response_model=ReceiptOut)
def post_unmatch(receipt_id: str, session: Session = Depends(get_session)):
    return unmatch_receipt(session, receipt_id)
