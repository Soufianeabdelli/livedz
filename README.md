# LiveDZ

Hybrid TikTok Live and QR commerce platform for Algerian cash-on-delivery (COD) sellers.

## What it does

LiveDZ lets a seller **take orders through three channels**, confirm them by phone in one dashboard, and ship them through an Algerian courier:

1. **QR / Link (`/q/{token}`)** — the seller prints a product card with a QR code or shares a link. The buyer picks a variant, sees wilaya delivery fees, enters phone/address, and places the order.
2. **TikTok Live capture + Claim Link (`/l/{sessionToken}`)** — during a live stream, a dedicated worker captures product-code comments (e.g. `K1`, `كود3`, `K1 42`) as expiring `DRAFT` reservations while logging viewer questions (`K1 شحال`). Buyers open `/l/{sessionToken}`, enter their TikTok `@username`, add phone/wilaya/commune/address, and move their order to `PENDING_CONFIRMATION`.
3. **Manual** — the merchant enters/manages orders from the dashboard.

## Architecture

```
┌───────────────┐  ┌─────────────────────────┐  ┌───────────────┐
│  Buyer opens  │  │  TikTok Live Worker     │  │   Merchant    │
│   /q/{token}  │  │  (DB lease + WS)        │  │  (dashboard)  │
└──────┬────────┘  └────────┬────────────────┘  └──────┬────────┘
       │ QR_LINK            │ LIVE_COMMENT -> DRAFT    │ MANUAL
       │                    ▼                          │
       │           ┌─────────────────────────┐         │
       │           │ Buyer Claim /l/{token}  │         │
       │           │ -> PENDING_CONFIRMATION │         │
       │           └────────┬────────────────┘         │
       └────────────────────┼──────────────────────────┘
                            ▼
  ┌───────────────────────────────────────────────────────────┐
  │ Unified Order & Stock Pipeline (PostgreSQL + Prisma)      │
  │ · Atomic Variant reservation / commit / release / restock │
  │ · Phone confirmation (CallLog, 3 no-answer tracking)      │
  │ · BuyerReputation risk flags · Per-wilaya DeliveryRate    │
  └─────────────────────────┬─────────────────────────────────┘
                            ▼
  ┌───────────────────────────────────────────────────────────┐
  │ Courier Handoff & Sync (DzShip -> Yalidine, ZR, …)        │
  │ · AES-256-GCM encrypted keys + CREDENTIALS_KEY_PREV ring  │
  │ · Per-attempt idempotency + SHIPMENT_UNKNOWN reconcile    │
  │ · /api/webhooks/courier (DELIVERED / RETURNED / CASH)     │
  └───────────────────────────────────────────────────────────┘
```

> **Engineering Presentation & Full Plan:** See [docs/LIVEDZ_PROJECT_PLAN.md](docs/LIVEDZ_PROJECT_PLAN.md) and the printable presentation [docs/LIVEDZ_DEV_PRESENTATION.html](docs/LIVEDZ_DEV_PRESENTATION.html).

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack, standalone output) |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma 7.10 with `@prisma/adapter-pg` |
| Auth | Firebase Authentication (Google sign-in, `httpOnly` session cookie) |
| Validation | Zod 4 |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 5 |
| Live capture | Standalone worker (`src/worker/live-worker.ts`) using `tiktok-live-connector` v2 |

## Getting started

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)
- A Firebase project with Google sign-in enabled

### 1. Install and configure

```bash
npm install
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Used by `docker-compose.yml` |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |
| `CREDENTIALS_KEY` | 32-byte base64 key for courier credential encryption |
| `CREDENTIALS_KEY_PREV` | Optional previous key(s) for zero-downtime key rotation |
| `COURIER_WEBHOOK_SECRET` | Shared secret for `POST /api/webhooks/courier` |
| `TIKTOK_SIGN_API_KEY`, `TIKTOK_SESSION_ID` | Optional TikTok Live worker credentials |
| `APP_URL` | Public URL (default `http://localhost:3000`) |

### 2. Start database, migrate, and seed

```bash
docker compose up -d
npx prisma migrate deploy --config prisma7.config.ts
npm run db:communes      # loads all 1,541 Algerian communes
npm run db:seed          # optional: demo merchant + product + QR cards
```

### 3. Run web app and live worker

```bash
npm run dev              # Web app -> http://localhost:3000
npm run worker:live      # Standalone TikTok Live worker + draft expiry sweeper
```

### 4. Checks & tests

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Project structure

```
docs/
├── LIVEDZ_PROJECT_PLAN.md        # Full engineering plan for dev team
└── LIVEDZ_DEV_PRESENTATION.html  # Printable presentation deck
src/
├── worker/
│   └── live-worker.ts     # Standalone DB-leased TikTok WS worker + draft sweeper
├── app/
│   ├── api/
│   │   ├── auth/          # Firebase session cookie endpoints
│   │   ├── health/        # Health check
│   │   ├── live/          # DB-backed live session start/stop/status
│   │   └── webhooks/courier/ # Courier status webhook (DELIVERED/RETURNED/CASH_COLLECTED)
│   ├── dashboard/         # Merchant dashboard + phone confirmation + shipping actions
│   ├── l/[token]/         # Buyer live-order claim page
│   ├── login/             # Google sign-in page
│   └── q/[token]/         # Buyer QR order page
└── lib/
    ├── live/              # Parser, TikTok v2 adapter, live orders, claim flow, DB lease manager
    ├── countries/dz/      # 69 wilayas (58 courier + 11 April 2026 mapped to parent)
    ├── couriers/          # Courier registry + DzShip client + parcel lookup
    ├── call-confirm.ts    # CallLog tracking (3 no-answer -> AWAITING_CUSTOMER)
    ├── courier-sync.ts    # Courier tracking sync + RETURNED restocking
    ├── crypto-secrets.ts  # AES-256-GCM encryption + key rotation ring
    ├── delivery-rates.ts  # Per-store wilaya HOME/STOPDESK delivery pricing
    ├── order-status.ts    # Full COD state machine
    ├── reputation.ts      # Per-store buyer COD risk tracking
    └── shipping.ts        # Atomic shipOrder + SHIPMENT_UNKNOWN reconciliation
```

## Staging deployment (Docker)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This runs three containers:
- `livedz-db` (`postgres:16`)
- `livedz-app` (Next.js standalone server on `:3000`)
- `livedz-worker` (Live capture worker + draft expiry sweeper)

> **Important:** Live comment capture relies on `tiktok-live-connector` (unofficial reverse-engineered Webcast client) and is provided on a best-effort basis. For Vercel web deployments, run `worker` separately on an always-on host sharing `DATABASE_URL`.

## License

Private — all rights reserved.
