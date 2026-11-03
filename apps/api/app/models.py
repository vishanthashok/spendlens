from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    holder_name: Mapped[str] = mapped_column(String)
    holder_role: Mapped[str] = mapped_column(String)
    department: Mapped[str] = mapped_column(String)
    last4: Mapped[str] = mapped_column(String)
    network: Mapped[str] = mapped_column(String, default="Visa")
    status: Mapped[str] = mapped_column(String, default="active")
    monthly_limit_cents: Mapped[int] = mapped_column(Integer)
    nickname: Mapped[str] = mapped_column(String)
    tone: Mapped[str] = mapped_column(String)

    controls: Mapped[list[CategoryControl]] = relationship(
        back_populates="card", cascade="all, delete-orphan"
    )
    transactions: Mapped[list[Transaction]] = relationship(back_populates="card")


class CategoryControl(Base):
    __tablename__ = "category_controls"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    card_id: Mapped[str] = mapped_column(ForeignKey("cards.id"), index=True)
    mcc_group: Mapped[str] = mapped_column(String)
    label: Mapped[str] = mapped_column(String)
    policy: Mapped[str] = mapped_column(String)

    card: Mapped[Card] = relationship(back_populates="controls")


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    mcc_group: Mapped[str] = mapped_column(String)
    mcc: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    monogram: Mapped[str] = mapped_column(String)

    transactions: Mapped[list[Transaction]] = relationship(back_populates="merchant")


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    department: Mapped[str] = mapped_column(String)
    owner: Mapped[str] = mapped_column(String)
    period_label: Mapped[str] = mapped_column(String)
    limit_cents: Mapped[int] = mapped_column(Integer)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    card_id: Mapped[str] = mapped_column(ForeignKey("cards.id"), index=True)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    budget_id: Mapped[str | None] = mapped_column(ForeignKey("budgets.id"), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String)
    decline_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    memo: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String)
    category_source: Mapped[str] = mapped_column(String)
    llm_category: Mapped[str] = mapped_column(String)
    llm_confidence: Mapped[float] = mapped_column(Float)
    llm_rationale: Mapped[str] = mapped_column(Text)
    receipt_status: Mapped[str] = mapped_column(String)

    card: Mapped[Card] = relationship(back_populates="transactions")
    merchant: Mapped[Merchant] = relationship(back_populates="transactions")
    receipt: Mapped[Receipt | None] = relationship(back_populates="transaction", uselist=False)


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    vendor: Mapped[str] = mapped_column(String)
    amount_cents: Mapped[int] = mapped_column(Integer)
    receipt_date: Mapped[datetime] = mapped_column(DateTime)
    uploaded_by: Mapped[str] = mapped_column(String)
    file_name: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String)
    transaction_id: Mapped[str | None] = mapped_column(
        ForeignKey("transactions.id"), nullable=True, unique=True
    )
    suggested_transaction_id: Mapped[str | None] = mapped_column(String, nullable=True)
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    transaction: Mapped[Transaction | None] = relationship(back_populates="receipt")
