"""Fictional October 2026 ledger for Northwind Studio, a 24-person product studio.

Budget limits are derived from actual spend so the chart has a deliberate shape:
most plans are under, equipment runs hot. Re-seed by deleting the sqlite file.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.categorize import suggest
from app.models import Budget, Card, CategoryControl, Merchant, Receipt, Transaction

PERIOD_LABEL = "October 2026"
COMPANY = "Northwind Studio"
TEAM = "24 people"

GROUPS: list[tuple[str, str]] = [
    ("software", "Software & SaaS"),
    ("airlines", "Airlines"),
    ("lodging", "Lodging"),
    ("ground", "Ground transport"),
    ("meals", "Meals"),
    ("office", "Office & supplies"),
    ("advertising", "Advertising"),
    ("contractors", "Contractors"),
    ("equipment", "Electronics"),
    ("jewelry", "Jewelry & luxury"),
    ("gambling", "Gambling"),
    ("cash_advance", "Cash advance"),
]

DEFAULT_POLICY = {
    "software": "allowed",
    "airlines": "allowed",
    "lodging": "allowed",
    "ground": "allowed",
    "meals": "allowed",
    "office": "allowed",
    "advertising": "review",
    "contractors": "allowed",
    "equipment": "review",
    "jewelry": "review",
    "gambling": "blocked",
    "cash_advance": "blocked",
}

POLICY_OVERRIDES = {
    "c_luis": {"advertising": "allowed"},
    "c_maya": {"equipment": "allowed"},
    "c_sam": {"lodging": "review", "airlines": "review"},
}

# category names that roll into each budget, in display order
BUDGET_SPECS = [
    ("b_software", "Software", "Engineering", "Jordan Hale", ["Software"], 0.79),
    ("b_travel", "Travel", "Leadership", "Avery Kim", ["Airfare", "Ground transport", "Lodging"], 0.92),
    ("b_meals", "Meals", "Studio", "Priya Shah", ["Meals"], 0.64),
    ("b_office", "Office", "Operations", "Priya Shah", ["Office", "Other"], 0.71),
    ("b_marketing", "Marketing", "Marketing", "Luis Ortega", ["Marketing"], 0.84),
    ("b_contractors", "Contractors", "Studio", "Luis Ortega", ["Contractors"], 0.80),
    ("b_equipment", "Equipment", "Design", "Maya Chen", ["Equipment"], 1.08),
]

CARDS = [
    ("c_maya", "Maya Chen", "Product Design", "Design", "4412", 400_000, "Design bench", "olive"),
    ("c_jordan", "Jordan Hale", "Engineering", "Engineering", "9021", 600_000, "Platform", "navy"),
    ("c_priya", "Priya Shah", "Operations", "Operations", "1184", 400_000, "Studio ops", "clay"),
    ("c_luis", "Luis Ortega", "Growth", "Marketing", "7730", 1_200_000, "Growth", "pine"),
    ("c_avery", "Avery Kim", "Studio Director", "Leadership", "2208", 1_200_000, "Leadership", "ink"),
    ("c_sam", "Sam Okonkwo", "People", "People", "5561", 250_000, "People", "sand"),
]

MERCHANTS = [
    ("m_figma", "Figma", "software", "5734", "San Francisco", "Fg"),
    ("m_notion", "Notion", "software", "5734", "San Francisco", "No"),
    ("m_aws", "Amazon Web Services", "software", "5734", "Seattle", "AWS"),
    ("m_openai", "OpenAI", "software", "5734", "San Francisco", "OA"),
    ("m_linear", "Linear", "software", "5734", "San Francisco", "Ln"),
    ("m_github", "GitHub", "software", "5734", "San Francisco", "Gh"),
    ("m_vercel", "Vercel", "software", "5734", "San Francisco", "Vc"),
    ("m_slack", "Slack", "software", "5734", "San Francisco", "Sl"),
    ("m_adobe", "Adobe", "software", "5734", "San Jose", "Ad"),
    ("m_frame", "Frame.io", "software", "5734", "San Francisco", "Fr"),
    ("m_delta", "Delta Air Lines", "airlines", "3058", "Atlanta", "DL"),
    ("m_united", "United Airlines", "airlines", "3000", "Chicago", "UA"),
    ("m_airbnb", "Airbnb", "lodging", "7011", "San Francisco", "Ab"),
    ("m_hyatt", "Hyatt Regency", "lodging", "3504", "Chicago", "Hy"),
    ("m_uber", "Uber", "ground", "4121", "San Francisco", "Ub"),
    ("m_lyft", "Lyft", "ground", "4121", "San Francisco", "Ly"),
    ("m_sweetgreen", "Sweetgreen", "meals", "5812", "Los Angeles", "Sg"),
    ("m_tartine", "Tartine Bakery", "meals", "5812", "San Francisco", "Ta"),
    ("m_nobu", "Nobu", "meals", "5812", "London", "Nb"),
    ("m_staples", "Staples", "office", "5943", "Framingham", "St"),
    ("m_wework", "Industrious", "office", "7399", "New York", "In"),
    ("m_meta", "Meta Ads", "advertising", "7311", "Menlo Park", "Me"),
    ("m_googleads", "Google Ads", "advertising", "7311", "Mountain View", "G"),
    ("m_apple", "Apple", "equipment", "5732", "Cupertino", "Ap"),
    ("m_bnh", "B&H Photo", "equipment", "5732", "New York", "BH"),
    ("m_upwork", "Upwork", "contractors", "7399", "San Francisco", "Up"),
    ("m_draftkings", "DraftKings", "gambling", "7995", "Boston", "DK"),
    ("m_atm", "ATM Cash Advance", "cash_advance", "6011", "San Francisco", "ATM"),
    ("m_tiffany", "Tiffany & Co.", "jewelry", "5944", "New York", "Tf"),
    ("m_amazon", "Amazon", "office", "5942", "Seattle", "Az"),
]


def _tx(
    id: str,
    month: int,
    day: int,
    hh: int,
    mm: int,
    card: str,
    merchant: str,
    cents: int,
    status: str = "posted",
    receipt: str = "matched",
    memo: str = "",
    category: str | None = None,
    decline: str | None = None,
) -> dict:
    return {
        "id": id,
        "occurred_at": datetime(2026, month, day, hh, mm),
        "card": card,
        "merchant": merchant,
        "cents": cents,
        "status": status,
        "receipt": "missing" if status == "declined" else receipt,
        "memo": memo,
        "category": category,
        "decline": decline,
    }


RAW_TXNS = [
    _tx("txn_01", 10, 2, 9, 14, "c_jordan", "m_figma", 7500, memo="Extra editor seat"),
    _tx("txn_02", 10, 2, 9, 18, "c_jordan", "m_notion", 1600, memo="Team wiki"),
    _tx("txn_03", 10, 3, 2, 11, "c_jordan", "m_aws", 184219, memo="October usage, prod and preview", category="Software"),
    _tx("txn_04", 10, 3, 11, 2, "c_jordan", "m_github", 4400, memo="Team plan"),
    _tx("txn_05", 10, 5, 8, 40, "c_jordan", "m_openai", 62000, memo="API usage, support agent"),
    _tx("txn_06", 10, 6, 16, 5, "c_jordan", "m_vercel", 2000, memo="Pro seat"),
    _tx("txn_07", 10, 8, 10, 12, "c_jordan", "m_linear", 800, memo="Issue tracker"),
    _tx("txn_08", 10, 12, 7, 55, "c_jordan", "m_slack", 8750, memo="Business+"),
    _tx("txn_09", 10, 22, 2, 6, "c_jordan", "m_aws", 210455, memo="Spike from preview deploys"),
    _tx("txn_10", 10, 28, 18, 22, "c_jordan", "m_openai", 48000, memo="Eval runs for categorization"),
    _tx("txn_11", 10, 4, 13, 20, "c_maya", "m_adobe", 7999, memo="CC all-apps, design"),
    _tx("txn_12", 10, 7, 11, 11, "c_maya", "m_figma", 4500, memo="Collab seat"),
    _tx("txn_13", 10, 9, 15, 46, "c_maya", "m_apple", 219900, receipt="missing", memo="MacBook Pro 14 for the design bench"),
    _tx("txn_14", 10, 14, 12, 2, "c_maya", "m_bnh", 52140, memo="Calibrite display and cable"),
    _tx("txn_15", 10, 19, 12, 41, "c_maya", "m_sweetgreen", 1840, memo="Lunch, studio"),
    _tx("txn_16", 10, 21, 18, 12, "c_maya", "m_uber", 3420, memo="Client site, SoMa"),
    _tx("txn_17", 10, 27, 8, 55, "c_maya", "m_tartine", 4215, memo="Coffee with Alloy"),
    _tx("txn_18", 10, 18, 9, 30, "c_maya", "m_frame", 1900, memo="Review links for the brand film"),
    _tx("txn_19", 10, 1, 8, 0, "c_priya", "m_wework", 89000, memo="Industrious, October desk"),
    _tx("txn_20", 10, 6, 14, 18, "c_priya", "m_staples", 14622, memo="Paper, toner, notebooks"),
    _tx("txn_21", 10, 11, 19, 44, "c_priya", "m_amazon", 8640, receipt="missing"),
    _tx("txn_22", 10, 13, 8, 21, "c_priya", "m_uber", 2210, memo="Airport run for Sam's candidate"),
    _tx("txn_23", 10, 16, 12, 36, "c_priya", "m_sweetgreen", 1680),
    _tx("txn_24", 10, 20, 15, 10, "c_priya", "m_staples", 6410, memo="Name badges for the offsite"),
    _tx("txn_25", 10, 24, 21, 5, "c_priya", "m_amazon", 21400, receipt="missing", memo="Studio monitor, ASUS", category="Equipment"),
    _tx("txn_26", 10, 30, 8, 2, "c_priya", "m_wework", 89000, memo="November desk, prepaid"),
    _tx(
        "txn_27",
        10,
        29,
        22,
        14,
        "c_priya",
        "m_atm",
        20000,
        status="declined",
        decline="Blocked by merchant controls. Cash advance is off for every card.",
    ),
    _tx("txn_28", 10, 3, 6, 12, "c_luis", "m_meta", 240000, memo="Q4 prospecting, lookalikes"),
    _tx("txn_29", 10, 8, 6, 40, "c_luis", "m_googleads", 185000, memo="Brand search, SF and NYC"),
    _tx("txn_30", 10, 10, 17, 25, "c_luis", "m_upwork", 160000, memo="Freelance editor, brand film", category="Contractors"),
    _tx("txn_31", 10, 17, 6, 18, "c_luis", "m_meta", 220000, receipt="missing", memo="Retargeting, site visitors"),
    _tx("txn_32", 10, 19, 20, 10, "c_luis", "m_nobu", 28640, memo="Client dinner, Alloy", category="Meals"),
    _tx("txn_33", 10, 23, 6, 33, "c_luis", "m_googleads", 98000, memo="YouTube pre-roll test"),
    _tx(
        "txn_34",
        10,
        25,
        23,
        48,
        "c_luis",
        "m_draftkings",
        20000,
        status="declined",
        decline="Blocked by merchant controls. Gambling is off for every card.",
    ),
    _tx("txn_35", 10, 26, 11, 4, "c_luis", "m_upwork", 140000, receipt="missing", memo="Motion designer, two-week sprint"),
    _tx("txn_36", 10, 27, 13, 15, "c_luis", "m_tiffany", 64000, receipt="missing", memo="Client gift, still needs a home"),
    _tx("txn_37", 10, 4, 7, 10, "c_avery", "m_delta", 84260, memo="SFO to JFK, Alloy kickoff"),
    _tx("txn_38", 10, 4, 18, 40, "c_avery", "m_uber", 6840, memo="JFK to hotel"),
    _tx("txn_39", 10, 5, 0, 20, "c_avery", "m_hyatt", 98012, memo="Hyatt Regency, two nights"),
    _tx("txn_40", 10, 5, 13, 5, "c_avery", "m_sweetgreen", 2410),
    _tx("txn_41", 10, 6, 16, 50, "c_avery", "m_delta", 84260, receipt="missing", memo="JFK to SFO return"),
    _tx("txn_42", 10, 9, 8, 15, "c_avery", "m_united", 128640, memo="SFO to AUS, team offsite"),
    _tx("txn_43", 10, 11, 15, 0, "c_avery", "m_airbnb", 164000, memo="Hudson Valley house, eight people", category="Lodging"),
    _tx("txn_44", 10, 12, 9, 40, "c_avery", "m_uber", 4215, memo="Austin airport"),
    _tx("txn_45", 10, 13, 19, 12, "c_avery", "m_lyft", 2780),
    _tx("txn_46", 10, 18, 11, 28, "c_avery", "m_delta", 214018, receipt="missing", memo="SFO to LHR, leadership summit"),
    _tx("txn_47", 10, 19, 21, 5, "c_avery", "m_nobu", 41022, receipt="missing", memo="Dinner, London"),
    _tx("txn_48", 10, 20, 8, 16, "c_avery", "m_uber", 5490, memo="Hotel to summit"),
    _tx("txn_49", 10, 26, 17, 44, "c_avery", "m_united", 186455, memo="LHR to SFO"),
    _tx("txn_50", 10, 7, 12, 20, "c_sam", "m_sweetgreen", 2140, memo="Lunch with a candidate"),
    _tx("txn_51", 10, 14, 9, 5, "c_sam", "m_tartine", 3680, memo="Recruiting coffee"),
    _tx("txn_52", 10, 15, 17, 48, "c_sam", "m_uber", 1860, memo="Caltrain to the office"),
    _tx("txn_53", 10, 22, 14, 0, "c_sam", "m_airbnb", 42000, memo="Candidate onsite, one night"),
    _tx("txn_54", 10, 28, 11, 30, "c_sam", "m_staples", 3812, memo="Welcome kits"),
    _tx(
        "txn_55",
        10,
        21,
        16,
        12,
        "c_sam",
        "m_airbnb",
        280000,
        status="declined",
        decline="Over the $2,500.00 monthly limit. Raise the limit or move the stay to the leadership card.",
    ),
    _tx("txn_56", 11, 1, 2, 12, "c_jordan", "m_aws", 9620, status="pending", receipt="missing", memo="November usage, partial"),
    _tx("txn_57", 11, 2, 8, 44, "c_avery", "m_uber", 4115, status="pending", receipt="missing", memo="SFO, early flight"),
    _tx("txn_58", 11, 2, 10, 2, "c_maya", "m_figma", 7500, status="pending", receipt="missing", memo="New contractor seat"),
    _tx("txn_59", 11, 3, 9, 18, "c_jordan", "m_openai", 4000, status="pending", receipt="missing", memo="Morning eval batch"),
]


def budget_for(category: str) -> str | None:
    for bid, _name, _dept, _owner, cats, _ratio in BUDGET_SPECS:
        if category in cats:
            return bid
    return None


def _plan_limit(actual_cents: int, ratio: float) -> int:
    if actual_cents <= 0:
        return 50_000
    raw = actual_cents / ratio
    return max(5_000, int(round(raw / 5_000.0) * 5_000))


def seed(session: Session) -> None:
    if session.query(Card).first():
        return

    merchants = {
        m[0]: Merchant(id=m[0], name=m[1], mcc_group=m[2], mcc=m[3], city=m[4], monogram=m[5])
        for m in MERCHANTS
    }
    session.add_all(merchants.values())

    cards = {}
    for cid, name, role, dept, last4, limit, nick, tone in CARDS:
        card = Card(
            id=cid,
            holder_name=name,
            holder_role=role,
            department=dept,
            last4=last4,
            monthly_limit_cents=limit,
            nickname=nick,
            tone=tone,
            status="active",
            network="Visa",
        )
        cards[cid] = card
        session.add(card)
        overrides = POLICY_OVERRIDES.get(cid, {})
        for group, label in GROUPS:
            policy = overrides.get(group, DEFAULT_POLICY[group])
            session.add(
                CategoryControl(
                    id=f"{cid}:{group}",
                    card_id=cid,
                    mcc_group=group,
                    label=label,
                    policy=policy,
                )
            )

    prepared = []
    for raw in RAW_TXNS:
        merchant = merchants[raw["merchant"]]
        suggestion = suggest(merchant.name, merchant.mcc_group, merchant.mcc)
        category = raw["category"] or suggestion.category
        source = "user" if raw["category"] else "llm"
        prepared.append((raw, category, source, suggestion, budget_for(category)))

    actuals: dict[str, int] = {spec[0]: 0 for spec in BUDGET_SPECS}
    for raw, category, _source, _suggestion, bid in prepared:
        if raw["status"] == "declined" or raw["occurred_at"] >= datetime(2026, 11, 1):
            continue
        if bid:
            actuals[bid] += raw["cents"]

    for bid, name, dept, owner, _cats, ratio in BUDGET_SPECS:
        session.add(
            Budget(
                id=bid,
                name=name,
                department=dept,
                owner=owner,
                period_label=PERIOD_LABEL,
                limit_cents=_plan_limit(actuals[bid], ratio),
            )
        )

    session.flush()

    for raw, category, source, suggestion, bid in prepared:
        session.add(
            Transaction(
                id=raw["id"],
                card_id=raw["card"],
                merchant_id=raw["merchant"],
                budget_id=bid,
                amount_cents=raw["cents"],
                occurred_at=raw["occurred_at"],
                status=raw["status"],
                decline_reason=raw["decline"],
                memo=raw["memo"],
                category=category,
                category_source=source,
                llm_category=suggestion.category,
                llm_confidence=suggestion.confidence,
                llm_rationale=suggestion.rationale,
                receipt_status=raw["receipt"],
            )
        )

    session.flush()

    for raw, _category, _source, _suggestion, _bid in prepared:
        if raw["receipt"] != "matched":
            continue
        merchant = merchants[raw["merchant"]]
        slug = merchant.name.lower().replace(" ", "-").replace("&", "and").replace(".", "")
        session.add(
            Receipt(
                id=f"rcpt_{raw['id']}",
                vendor=merchant.name,
                amount_cents=raw["cents"],
                receipt_date=raw["occurred_at"],
                uploaded_by=cards[raw["card"]].holder_name,
                file_name=f"{slug}-{raw['id']}.pdf",
                note=raw["memo"] or "Uploaded from the cardholder's camera.",
                status="matched",
                transaction_id=raw["id"],
                suggested_transaction_id=raw["id"],
                match_score=0.99,
            )
        )

    inbox = [
        Receipt(
            id="r_delta",
            vendor="Delta Air Lines",
            amount_cents=84260,
            receipt_date=datetime(2026, 10, 6, 16, 50),
            uploaded_by="Avery Kim",
            file_name="delta-jfk-sfo.pdf",
            note="Return boarding pass and fare receipt.",
            status="unmatched",
            suggested_transaction_id="txn_41",
            match_score=0.94,
        ),
        Receipt(
            id="r_nobu",
            vendor="Nobu",
            amount_cents=41022,
            receipt_date=datetime(2026, 10, 19, 21, 5),
            uploaded_by="Avery Kim",
            file_name="nobu-london.pdf",
            note="Dinner, four people. Card slip is in the photo.",
            status="unmatched",
            suggested_transaction_id="txn_47",
            match_score=0.97,
        ),
        Receipt(
            id="r_amazon",
            vendor="Amazon",
            amount_cents=21400,
            receipt_date=datetime(2026, 10, 24, 21, 5),
            uploaded_by="Priya Shah",
            file_name="amazon-monitor.pdf",
            note="ASUS monitor. Order confirmation attached.",
            status="unmatched",
            suggested_transaction_id="txn_25",
            match_score=0.93,
        ),
        Receipt(
            id="r_blue",
            vendor="Blue Bottle Coffee",
            amount_cents=2740,
            receipt_date=datetime(2026, 10, 16, 9, 12),
            uploaded_by="Priya Shah",
            file_name="blue-bottle-1016.pdf",
            note="Team coffee. No card line matches this amount.",
            status="unmatched",
        ),
        Receipt(
            id="r_bay",
            vendor="Bay Print Co.",
            amount_cents=6400,
            receipt_date=datetime(2026, 10, 18, 11, 40),
            uploaded_by="Priya Shah",
            file_name="bay-print-1018.pdf",
            note="Offsite agendas. Still waiting on the card charge.",
            status="unmatched",
        ),
    ]
    session.add_all(inbox)
    session.commit()
