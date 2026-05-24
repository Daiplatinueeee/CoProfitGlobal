# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoProfitGlobal is a network marketing platform with genealogy tree management, binary volume tracking, multi-tier commission calculations, and a wallet/payout system. It is a monorepo with separate `frontend/` and `backend/` directories.

## Commands

### Backend (NestJS — run from `backend/`)
```bash
npm run start:dev           # development with hot reload (port 3000)
npm run build               # compile TypeScript via nest build
npm run start:prod          # run compiled dist/main.js
npm run lint                # eslint with auto-fix
npm run test                # jest unit tests
npm run test:watch          # jest in watch mode
npm run test:cov            # coverage report
npm run test:e2e            # end-to-end tests
npx ts-node src/scripts/seed-admin.ts  # seed admin user
```

Run a single test file:
```bash
npx jest src/modules/users/users.service.spec.ts
```

### Frontend (React+Vite — run from `frontend/`)
```bash
npm run dev             # vite dev server (port 5173)
npm run build           # tsc -b && vite build
npm run lint            # eslint
npm run preview         # preview production build
```

### Environment Variables
**Backend** (`backend/.env`):
```
MONGO_URI=
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_COOKIE_NAME=refresh_token
BCRYPT_SALT_ROUNDS=10
PORT=3000
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:3000
```

## Architecture

### Stack
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS 4, React Router v7, Recharts, Axios
- **Backend**: NestJS 11 + TypeScript, MongoDB/Mongoose, Passport-JWT, NestJS Schedule

### Backend (`backend/src/`)
All business logic lives in `modules/`. Each module follows NestJS conventions: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts`, and DTOs.

Key modules:
- **auth** — JWT login/register, refresh token rotation (httpOnly cookies), multi-device session tracking via `refreshSessions[]` array on the User document
- **users** — User schema with roles (`USER`/`ADMIN`) and membership tiers (`FREE`, `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`); stores `packagePin` as plain text (indexed, never hashed)
- **genealogy** — Binary tree nodes: `parentUserId`, `position` (left/right), `leftChildUserId`, `rightChildUserId`, `ancestors[]`, `depth`
- **activations** — Records tier activations (bronze=1pt, silver=3pt, gold=5pt, platinum=7pt); feeds sign5 and leadership qualification
- **volume** — Dual-leg volume buckets (`VolumeBucket`: ownerUserId + leg unique index) and audit ledger (`VolumeLedger`: eventKey + ownerUserId unique index)
- **wallet** — Multi-currency ledger (`php`, `points`, `gc_points`); idempotency via unique `refKey`; sources: `pairing`, `repeat_binary`, `sign5`, `leadership`, `spillover`, `referral_direct`, `referral_indirect`, `admin_adjustment`, `withdrawal`, `tier_upgrade`
- **pairing** — Binary pairing bonus: PHP 400/point; tier caps (bronze=3, silver=16, gold=30, platinum=50 pairs/cycle); AM/PM cycles; carry-over logic stored in `PairingState` (userId + periodKey unique index)
- **periods** — Resolves day keys (`YYYY-MM-DD`) and leadership windows used by volume/pairing/sign5
- **leaderboard / leadership / sign5** — Award and ranking systems; sign5 triggers on sponsor qualifying activations
- **withdrawal** — Request lifecycle: `pending → approved → rejected → completed`; fee model: `amount` = requested (debited from wallet on approve), `vat` = 10% processing fee (informational), `totalAmount` = net user receives (`amount − vat − ₱50 admin fee`); balance check requires only `amount`, not `amount + fees`
- **product-pins** — Physical PIN inventory; `pin` stored as plain text (never bcrypt-hashed — schema has a pre-save guard that throws if a `$2`-prefixed value is detected); statuses: `UNUSED/USED/VOID`
- **unilevel-products** — Product catalog with PV (point value); purchases go through admin approval (`pending/approved/rejected`); tracks `proofImageUrl` for payment proof
- **admin** — Aggregate admin operations: pin generation, user tier upgrades, user restrictions

### Frontend (`frontend/src/`)
- **`contexts/AuthContext.tsx`** — Global auth state; intercepts `window.fetch` globally to inject the access token and handle 401s; deduplicates concurrent refresh calls with a shared promise; shows `SessionExpiredModal` on refresh failure
- **`lib/apiFetch.ts`** — Legacy Axios wrapper still used in some tabs; simpler single-retry refresh; used alongside `AuthContext` (mixed approach)
- **`App.tsx`** — Route definitions and `AuthProvider` / `CartProvider` wrappers
- **`sections/`** — Page-level components organized by role:
  - `landingSections/` — Public landing page and cart
  - `authentication/` — Login and register flows
  - `user/userDashboard` — Main authenticated user UI
  - `admin/adminDashboard` — Admin panel
  - `tabs/` — Sub-tabs rendered inside dashboards

**Tab inventory** (in `frontend/src/tabs/`):
- User tabs: `Genealogy`, `Pairing`, `Leaderboards`, `Transactions`, `Payout`, `ViewMyAccount`, `ReferalsHierarchy`, `Subscription`, `WithdrawGC`, `UnilevelProducts`
- Admin tabs: `GeneratePin`, `GenerateProductPin`, `UsersOverview`, `PendingPayouts`, `PendingRequests`, `PendingUnilevelPurchases`, `PendingUnilevelPackages`, `PendingWithdrawGC`

### Authentication Flow
1. Login returns a short-lived access token and sets a `refresh_token` httpOnly cookie.
2. `AuthContext` intercepts `window.fetch`; on 401, calls `/auth/refresh` (deduplicated), retries original request.
3. On refresh failure, `SessionExpiredModal` is shown and the user is logged out.
4. The backend `JwtAuthGuard` + `RolesGuard` protect routes; `@Roles(Role.ADMIN)` gates admin endpoints.
5. Auth endpoints are never retried on 401 to prevent infinite loops.

### Domain Rules (critical for business logic changes)
- **Tier upgrade**: can only go to a higher tier than current; same or lower is rejected
- **Pairing rate**: PHP 400 per paired point
- **Activation points by tier**: bronze=1, silver=3, gold=5, platinum=7
- **Daily pair caps by tier**: FREE=0, bronze=3, silver=16, gold=30, platinum=50
- **Wallet idempotency**: always pass a deterministic `refKey` when crediting/debiting; duplicates are silently ignored
- **Volume ledger idempotency**: `eventKey` must be unique per `ownerUserId`
- **ProductPin plain-text rule**: PINs are stored and compared as plain text; never pass them through bcrypt

### FREE vs REGULAR Package Pins

Package pins have two types, controlled by the `isFree: boolean` field on both `ProductPin` and `User` documents.

**The gating rule is source-based (child-based), not recipient-based:**

| Child placed | Parent/Upline | Parent can receive? |
|---|---|---|
| FREE → FREE | FREE parent | ❌ No |
| FREE → Regular | REGULAR parent | ❌ No |
| Regular → Free | FREE parent | ✅ Yes |

| Behavior | FREE child (`isFree=true`) | REGULAR child (`isFree=false`) |
|----------|--------------------------|------------------------------|
| Generates volume for uplines on activation | No | Yes (all uplines, regardless of their FREE/REGULAR status) |
| Generates referral bonuses for uplines | No | Yes (all uplines, regardless of their FREE/REGULAR status) |
| Uplines eligible for Sign5 / Leadership bonuses from this activation | No | Yes (including FREE uplines) |
| Upline pairing cap when volume arrives | N/A (no volume flows) | FREE uplines: 3/cycle (BRONZE-equivalent); REGULAR uplines: tier cap |

**How the gating works — source-only defense:**
1. `awardActivationVolume` returns immediately when the **source** (child) user is FREE — so volume never flows from FREE sources.
2. `awardPlacementBonuses` returns immediately when the **incoming member** (child) is FREE — so referral PHP never flows from FREE placements.
3. All recipient-level checks are intentionally absent — FREE uplines/ancestors receive everything a REGULAR upline would when a REGULAR child activates below them.

**Pin format conventions:**
- FREE pins: first character is `'F'` (e.g., `"FA1234"`) — visual identifier for admins; `isFree: true`
- REGULAR pins: first character is any letter except `'F'`; `isFree: false`
- Legacy static FREE pin: hardcoded string `"AB1234"` — always maps to `MembershipTier.FREE`, never stored in DB

**Changes made (2026-05-24) and what they prevent:**

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `genealogy.service.ts` `placeExistingMember` | Added `volumeService.awardActivationVolume` call (parallel with placement bonuses) | REGULAR ancestors receiving zero volume when an existing user is placed via the admin "place existing member" flow |
| `volume.service.ts` `creditVolumeToUplines` | Removed the bulk fetch of ancestor user docs and the `ancestorUser.isFree` skip | FREE ancestors not receiving volume points when a REGULAR member activates below them |
| `genealogy.service.ts` `awardPlacementBonuses` (2026-05-24 rev 2) | Added `sponsorIsFree` check on the non-ancestor sponsor path; added `ancestor.isFree` / `ancestor.membershipTier === FREE` check inside the ancestor loop | FREE sponsors and FREE ancestors incorrectly receiving direct/indirect referral PHP bonuses when a REGULAR member is placed |
| `sign5.service.ts` `evaluateForUser` | Added early exit when evaluated user is FREE (`isFree` or `membershipTier === FREE`) | FREE accounts incorrectly receiving Sign5 cash payouts |
| `wallet.service.ts` `credit()` | Added FREE account bonus guard before idempotency check; blocks all bonus PHP sources (`pairing`, `repeat_binary`, `sign5`, `leadership`, `spillover`, `referral_direct`, `referral_indirect`) for FREE accounts | Any upstream bug or direct API call bypassing service-level checks could still credit bonuses to FREE accounts |
| `withdrawal.service.ts` `submitRequest` + `approve` | Changed fee model: `totalAmount` now stores net payout (`amount − 10% − ₱50`); balance check validates against `amount` only; `approve` debits `doc.amount` not `doc.totalAmount` | "Insufficient balance" error when user had exactly enough (old code required `amount + 10% + ₱50` in wallet); also prevented admin from over-debiting the net payout amount instead of the full requested amount |
| `Payout.tsx` payment method options | Gave "Cash" its own `value="cash"` (was duplicating `value="bank"` with Bank Transfer) | Selecting "Cash" was stored as `bank` and displayed as "Bank Transfer" in admin pending payouts |
| `PendingPayouts.tsx` | Added `PAYMENT_METHOD_LABELS` map (`cash→Cash`, `bank→Bank Transfer`, `wallet→Gcash`, `crypto→Paymaya`); renamed "Amount" header to "Amount Requested"; removed "Total" column | Payment method values were displayed as raw keys (e.g. `bank`) instead of human-readable labels |

**Changes made (2026-05-24 rev 3) — source-based gating concept:**

Gating model changed from **recipient-based** to **source-based**. The child's `isFree` status determines whether any bonuses flow — the recipient's status is irrelevant.

| Location | Change | Purpose |
|----------|--------|---------|
| `genealogy.service.ts` `awardPlacementBonuses` | Removed `sponsorIsFree` guard on non-ancestor sponsor path | FREE sponsors now receive direct referral PHP when a REGULAR child is placed |
| `genealogy.service.ts` `awardPlacementBonuses` | Removed `ancestor.isFree` / `ancestor.membershipTier === FREE` guard in ancestor loop | FREE ancestors now receive direct/indirect referral PHP when a REGULAR child is placed |
| `wallet.service.ts` `credit()` | Removed FREE recipient bonus guard entirely | FREE users can now receive all bonus types (pairing, sign5, leadership, referral) when they earned them from REGULAR sources |
| `sign5.service.ts` `evaluateForUser` | Removed FREE user early exit | FREE users now qualify for Sign5 payouts if they sponsored REGULAR members |
| `leadership.service.ts` `evaluate` | Removed FREE user early exit | FREE users now qualify for Leadership payouts if their downline (REGULAR) generated sufficient pairing volume |
| `pairing.service.ts` `TIER_CAP_MAP[FREE]` | Changed from `0` to `3` (BRONZE-equivalent) | FREE users can now convert volume to PHP via pairing (up to 3 pairs/cycle) when REGULAR children activated below them |
| `pairing.service.ts` `tryPairIfPossible` | Removed `isFree ? 0` dailyCap override | FREE user pairing cap now reads from TIER_CAP_MAP (3) instead of being hard-forced to 0 |

### CORS
Backend allows: `https://co-profit-global.vercel.app`, `https://coprofit-global.com`, `https://www.coprofit-global.com`, `http://localhost:5173`. Credentials are enabled for cookie handling.
