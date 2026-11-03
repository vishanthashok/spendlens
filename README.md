# SpendLens

Corporate card spend for a small team. SpendLens is the October close for **Northwind Studio**: statement limits, merchant-category controls, receipt matching, and a review queue for charges the categorizer isn't sure about.

Portfolio project by Vishanth Ashok. Public source: [github.com/vishanthashok/spendlens](https://github.com/vishanthashok/spendlens).

![October close](docs/screenshots/overview.png)

## Stack

- **Web:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts
- **API:** FastAPI, Pydantic, SQLAlchemy
- **Database:** SQLite for the local demo. Postgres when `DATABASE_URL` is set

The UI talks to the API through typed hooks in `apps/web/src/hooks/useSpend.ts`. Limit edits, category overrides, merchant controls, and receipt matches update the cache before the response returns, and roll back if the request fails.

## Run it

Requirements: Node 22+, Python 3.12.

```bash
./scripts/dev.sh
```

- App: [http://127.0.0.1:43123](http://127.0.0.1:43123)
- API docs: [http://127.0.0.1:43124/docs](http://127.0.0.1:43124/docs)

The Vite dev server proxies `/api` to the API, so the app is the only URL you need open.

### Postgres instead of SQLite

```bash
docker compose up -d
DATABASE_URL=postgresql+psycopg://spendlens:spendlens@localhost:54329/spendlens ./scripts/dev.sh
```

`postgres://` URLs are rewritten to `postgresql+psycopg://`. An empty database is migrated and seeded on startup.

### Tests

```bash
./scripts/test.sh
```

API tests use an in-memory SQLite database and cover the October totals, limit rejection, category overrides, the categorizer, receipt matching, and merchant controls.

### Reset the demo

Stop the API and delete `apps/api/data/spendlens.db`. The next start reseeds Northwind Studio. Postgres resets the same way if you drop the volume (`docker compose down -v`).

## Screens

The demo opens on a finished October statement, plus a few November charges that arrived after the books closed. These captures are the running app.

### Overview

The headline is plan versus spend. Under it: daily spend, category mix, budget versus actual, and the exception queue.

![Overview](docs/screenshots/overview.png)

### Transactions

Filter by cardholder, category, status, receipt, or "Needs review". Auto means the model filed it. You means a person confirmed or changed it. Confirm is one click. Picking another category saves immediately.

![Transactions](docs/screenshots/transactions.png)

### Cards

Six Visa cards. The face updates as you drag the limit; Save writes it through the optimistic hook. Allow / Review / Block is per merchant category, per card. Freeze stops the card without deleting history.

![Cards](docs/screenshots/cards.png)

### Receipts

Uploads that are not attached yet. Delta's return flight, the London dinner, and the studio monitor each have a suggested charge. Two uploads (Blue Bottle, Bay Print) do not match anything on the ledger.

![Receipts](docs/screenshots/receipts.png)

### Budgets

Grouped bars for plan and actual. Equipment is the one over plan, drawn in red. The table shows owner, variance, and percent used. Open it from the overview chart.

## How the close is shaped

Northwind is fictional. The seed in `apps/api/app/seed.py` is a 24-person studio with six cardholders:

| Cardholder | Card | What you'll notice |
| --- | --- | --- |
| Luis Ortega | ••7730 | Growth. Closest to the limit. Ads and contractors. |
| Jordan Hale | ••9021 | Platform. AWS and OpenAI. |
| Avery Kim | ••2208 | Leadership travel, including a declined-looking receipt still loose. |
| Maya Chen | ••4412 | Design bench. The Apple charge is a low-confidence equipment guess with no receipt. |
| Priya Shah | ••1184 | Studio ops. One Amazon charge was reclassified from Office to Equipment. |
| Sam Okonkwo | ••5561 | People. A candidate stay was declined for going over the limit. |

Two other declines are merchant controls, not limits: DraftKings (gambling) and an ATM cash advance. Both groups start blocked on every card. Advertising is review-only except on the growth card. Electronics are review-only except on the design card.

## Categorizer

`apps/api/app/categorize.py` is a local stand-in for an LLM. It returns the same shape a model call would: `category`, `confidence`, and a one-sentence rationale. Nothing in the demo needs an API key.

Confidence under 75% is `needsReview`. Confirming or choosing a category sets `categorySource` to `user` and leaves the original suggestion on the charge, so the drawer can say what the model thought. "Re-run model" calls `POST /api/transactions/{id}/categorize` and refreshes that suggestion. Swap the module for a provider client without changing the UI.

## API

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/summary` | October KPIs, daily spend, budgets, exception queue |
| GET | `/api/transactions` | Filterable ledger (`q`, `cardId`, `category`, `status`, `receipt`, `attention=review`) |
| PATCH | `/api/transactions/{id}/category` | One-click confirm or override |
| POST | `/api/transactions/{id}/categorize` | Re-run the categorizer. `{ "apply": true }` files its answer |
| GET | `/api/cards` | Cards, statement spend, category controls |
| PATCH | `/api/cards/{id}/limit` | Statement limit. Rejects a limit under October spend |
| PATCH | `/api/cards/{id}/controls` | `allowed`, `review`, or `blocked` for one MCC group |
| PATCH | `/api/cards/{id}/status` | `active` or `frozen` |
| GET | `/api/budgets` | Plan versus actual |
| GET | `/api/receipts` | Inbox first, then matched uploads |
| POST | `/api/receipts/{id}/match` | Attach a receipt to a charge |
| POST | `/api/receipts/{id}/unmatch` | Detach it |

Amounts are integer cents.

## Layout

```
apps/web     React dashboard
apps/api     FastAPI ledger, seed, and tests
scripts      ./scripts/dev.sh and ./scripts/test.sh
```

OpenAPI lives at `/docs` when the API is running.

## Deploy on Vercel

One project serves both: `vercel.json` builds the Vite SPA (`apps/web/dist`) and routes `/api/*` to FastAPI via `api/index.py`. On Vercel the SQLite DB lives in `/tmp` and is reseeded with Northwind data on each cold start, so demo edits (categorize/match) reset. Set `DATABASE_URL` to a Postgres URL for persistence.
