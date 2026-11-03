"""Deterministic stand-in for an LLM categorizer.

The response shape is what a model call would return: a category, a confidence
score, and a one-sentence rationale. Swap this module for a provider client
without changing the API or the UI. Nothing here calls a network.
"""

from __future__ import annotations

from dataclasses import dataclass

REVIEW_BELOW = 0.75

CATEGORIES = [
    "Software",
    "Airfare",
    "Lodging",
    "Ground transport",
    "Meals",
    "Office",
    "Marketing",
    "Contractors",
    "Equipment",
    "Other",
]


@dataclass(frozen=True)
class Suggestion:
    category: str
    confidence: float
    rationale: str


def suggest(merchant_name: str, mcc_group: str, mcc: str) -> Suggestion:
    if merchant_name == "Amazon":
        return Suggestion(
            "Office",
            0.58,
            "Amazon marketplace authorization with no line items. Earlier Amazon charges on this card were pantry and office supplies, so Office is the best guess until someone checks the receipt.",
        )
    if merchant_name == "Apple":
        return Suggestion(
            "Equipment",
            0.62,
            "Apple charge on an electronics MCC. This card also pays for iCloud, so it could be a subscription. With no memo, hardware is the slightly better guess.",
        )
    if merchant_name == "Tiffany & Co.":
        return Suggestion(
            "Other",
            0.41,
            "Luxury jeweler, MCC 5944. Nothing else on this card looks like a client gift, so it stays in Other until someone places it.",
        )

    table: dict[str, tuple[str, float, str]] = {
        "software": (
            "Software",
            0.96,
            f"{merchant_name} matches software and cloud services this team already pays for (MCC {mcc}).",
        ),
        "airlines": (
            "Airfare",
            0.97,
            f"{merchant_name} is an airline (MCC {mcc}). Categorized as airfare on the travel budget.",
        ),
        "lodging": (
            "Lodging",
            0.94,
            f"{merchant_name} is lodging (MCC {mcc}). Categorized as lodging on the travel budget.",
        ),
        "ground": (
            "Ground transport",
            0.95,
            f"{merchant_name} is a rideshare authorization (MCC {mcc}). Categorized as ground transport.",
        ),
        "meals": (
            "Meals",
            0.90,
            f"{merchant_name} is a restaurant (MCC {mcc}). Categorized as meals.",
        ),
        "office": (
            "Office",
            0.88,
            f"{merchant_name} looks like an office supplier or workspace (MCC {mcc}). Categorized as office.",
        ),
        "advertising": (
            "Marketing",
            0.93,
            f"{merchant_name} is an ad platform (MCC {mcc}). Categorized as marketing.",
        ),
        "contractors": (
            "Contractors",
            0.86,
            f"{merchant_name} is a contractor marketplace payout (MCC {mcc}). Categorized as contractors.",
        ),
        "equipment": (
            "Equipment",
            0.80,
            f"{merchant_name} is an electronics retailer (MCC {mcc}). Categorized as equipment.",
        ),
        "gambling": (
            "Other",
            0.99,
            f"{merchant_name} is MCC {mcc}, a gambling code. Category controls block this group.",
        ),
        "cash_advance": (
            "Other",
            0.99,
            f"{merchant_name} is a cash-advance MCC ({mcc}). Category controls block this group.",
        ),
    }
    category, confidence, rationale = table.get(
        mcc_group,
        ("Other", 0.4, f"No rule matched {merchant_name}. Left in Other for review."),
    )
    return Suggestion(category, confidence, rationale)


def needs_review(category_source: str, confidence: float, status: str) -> bool:
    return status != "declined" and category_source != "user" and confidence < REVIEW_BELOW
