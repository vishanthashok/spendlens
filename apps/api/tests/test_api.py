def test_health(client):
    body = client.get("/api/health").json()
    assert body["ok"] is True
    assert body["database"] == "sqlite"


def test_october_ledger_balances(client):
    summary = client.get("/api/summary").json()
    txns = client.get("/api/transactions").json()["transactions"]
    october = [
        t
        for t in txns
        if t["occurredAt"].startswith("2026-10") and t["status"] != "declined"
    ]
    assert summary["spendCents"] == sum(t["amountCents"] for t in october)
    assert summary["transactionCount"] == len(october)
    assert sum(b["actualCents"] for b in summary["budgets"]) == summary["spendCents"]
    assert summary["varianceCents"] == summary["budgetCents"] - summary["spendCents"]
    assert summary["needsReview"] == 3
    assert summary["receiptsMissing"] >= 1
    assert summary["sinceCloseCents"] > 0
    assert any(b["actualCents"] > b["limitCents"] for b in summary["budgets"])


def test_limit_rejects_below_spend_and_accepts_a_raise(client):
    before = next(c for c in client.get("/api/cards").json() if c["id"] == "c_jordan")
    rejected = client.patch("/api/cards/c_jordan/limit", json={"monthlyLimitCents": 100})
    assert rejected.status_code == 400
    assert "October spend" in rejected.json()["detail"]
    unchanged = next(c for c in client.get("/api/cards").json() if c["id"] == "c_jordan")
    assert unchanged["monthlyLimitCents"] == before["monthlyLimitCents"]

    raised = client.patch("/api/cards/c_sam/limit", json={"monthlyLimitCents": 300000})
    assert raised.status_code == 200
    assert raised.json()["monthlyLimitCents"] == 300000
    assert raised.json()["statementSpendCents"] == before_sam_spend(client)


def before_sam_spend(client):
    sam = next(c for c in client.get("/api/cards").json() if c["id"] == "c_sam")
    return sam["statementSpendCents"]


def test_category_override_sticks_and_keeps_model_suggestion(client):
    res = client.patch("/api/transactions/txn_13/category", json={"category": "Software"})
    assert res.status_code == 200
    body = res.json()
    assert body["category"] == "Software"
    assert body["categorySource"] == "user"
    assert body["needsReview"] is False
    assert body["llmCategory"] == "Equipment"
    assert body["llmConfidence"] == 0.62

    unknown = client.patch("/api/transactions/txn_13/category", json={"category": "Gambling"})
    assert unknown.status_code == 422


def test_categorizer_is_stable(client):
    res = client.post("/api/transactions/txn_13/categorize", json={"apply": False})
    assert res.status_code == 200
    body = res.json()
    assert body["category"] == "Equipment"
    assert body["confidence"] < 0.75
    assert body["applied"] is False
    assert "Apple" in body["rationale"]
    assert body["transaction"]["categorySource"] == "llm"


def test_receipt_match_links_both_sides(client):
    res = client.post("/api/receipts/r_delta/match", json={"transactionId": "txn_41"})
    assert res.status_code == 200
    assert res.json()["status"] == "matched"
    assert res.json()["transactionId"] == "txn_41"
    txn = client.get("/api/transactions/txn_41").json()
    assert txn["receiptStatus"] == "matched"

    undone = client.post("/api/receipts/r_delta/unmatch")
    assert undone.status_code == 200
    assert undone.json()["status"] == "unmatched"
    assert client.get("/api/transactions/txn_41").json()["receiptStatus"] == "missing"


def test_filters_and_blocked_merchant(client):
    declined = client.get("/api/transactions", params={"cardId": "c_sam", "status": "declined"}).json()
    assert declined["total"] == 1
    assert declined["transactions"][0]["merchant"]["name"] == "Airbnb"
    assert "monthly limit" in declined["transactions"][0]["declineReason"]

    gambling = client.get("/api/transactions", params={"q": "DraftKings"}).json()["transactions"]
    assert len(gambling) == 1
    assert gambling[0]["status"] == "declined"
    assert "Gambling" in gambling[0]["declineReason"]


def test_merchant_controls(client):
    res = client.patch(
        "/api/cards/c_maya/controls",
        json={"mccGroup": "gambling", "policy": "allowed"},
    )
    assert res.status_code == 200
    gambling = next(c for c in res.json()["controls"] if c["mccGroup"] == "gambling")
    assert gambling["policy"] == "allowed"
    blocked = next(c for c in res.json()["controls"] if c["mccGroup"] == "cash_advance")
    assert blocked["policy"] == "blocked"
