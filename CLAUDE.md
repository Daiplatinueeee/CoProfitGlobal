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
- User tabs: `Genealogy`, `Pairing`, `Leaderboards`, `Transactions`, `Payout`, `ViewMyAccount`, `ReferalsHierarchy`, `Subscription`, `WithdrawGC`, `UnilevelProducts`, `StairstepProgram`
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

**Changes made (2026-06-01) — Sign5 monthly reset scheduler:**

Sign5 was only evaluated reactively (when `activateAndPlace` triggered `evaluateForUser`). There was no proactive sweep, so monthly counters never reset on the 1st of a new month unless a new activation happened for each user. Additionally, `ScheduleModule.forRoot()` was missing from `app.module.ts`, meaning ALL `@Cron` decorators in the app (including the pairing scheduler) were silently not executing.

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `app.module.ts` | Added `ScheduleModule.forRoot()` import | All `@Cron` decorators (pairing + sign5 + future) were registered but never executed without the schedule module being initialized |
| `sign5/sign5.scheduler.ts` (new file) | `@Cron('0 0 0 1 * *')` — runs at midnight on the 1st of each month; sweeps all users and calls `evaluateForUser` for each | Sign5 monthly counters were never reset/initialized at the start of a new month unless a reactive activation happened to trigger it |
| `sign5/sign5.module.ts` | Added `Sign5Scheduler` to `providers` array | Scheduler bean not instantiated — cron would never run |

**Why each month naturally isolates (by design):**
- `evaluateForUser` uses `currentMonthKey()` (YYYY-MM) as the document key
- `countDirectReferralActivations` queries `User.createdAt` within the exact UTC date range of the requested month
- `Sign5Award` and `Sign5Status` have a unique index on `(userId, monthKey[, tier])` — so each month is a separate set of documents; no carryover is possible
- The scheduler sweep simply initializes this month's documents for all users at month-start so the UI shows 0 counts immediately (instead of showing stale prior-month data or null)

**Changes made (2026-06-01 rev 2) — Sign5 bonus card shows current month, not all-time total:**

The "Total Sign-5 Bonus (PHP)" dashboard card was reading `income.sign5Bonus` which comes from `user.totalSign5Bonus` — a cumulative, admin-editable all-time total that never resets. At the start of a new month it still showed the previous months' earnings.

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `userDashboard.tsx` sign5Status state | Added `monthCashAmountPhp: number` field; populated by summing `award.cashAmountPhp` across all tier awards returned by the current-month status endpoint | Old state only tracked counts and timesTriggered, not cash earned this month |
| `userDashboard.tsx` sign5Status setter | Added `else` branch when `data.status` is null (no awards yet this month): sets `monthCashAmountPhp: 0` | Without this, a brand-new month with no referrals would leave `monthCashAmountPhp` from the previous render (stale) |
| `userDashboard.tsx` Sign-5 Bonus card | Changed data source from `income?.sign5Bonus` (all-time wallet total from User doc) to `sign5Status?.monthCashAmountPhp` (current-month awards sum); uses `sign5StatusLoading` spinner; renamed label to "Sign-5 Bonus This Month (PHP)" | Card showed ₱500 (or any prior total) instead of ₱0 on the first of a new month |

**Do not revert to `income.sign5Bonus` for this card.** `income.sign5Bonus` (`user.totalSign5Bonus`) is intentionally cumulative and admin-editable — it is correct for the "total earnings breakdown" use case but wrong for a per-month progress indicator.

**Changes made (2026-06-01 rev 3) — Pairing flush label differentiation + amount display fix:**

Two pairing-flush scenarios were conflated under a single `PAIRING_FLUSH` source, causing wrong labels and incorrect PHP totals.

**The flush scenarios:**

| Scenario | When | Source enum | Frontend label |
|----------|------|-------------|----------------|
| Cap exhausted, no pairing fired | Both buckets have points but cap is already at limit — both cleared, ₱0 payout | `PAIRING_CAP_REACHED` | "Pairing Cap Reached" |
| Cap hit DURING pairing, excess cleared | Last pairing of the cycle fires, remainder beyond what was paired is discarded | `PAIRING_CAP_REACHED` | "Pairing Cap Reached" |

**Points persist in buckets until paired or cap is hit — there is no scheduled cycle flush.**

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `wallet-transaction.schema.ts` | Added `PAIRING_CAP_REACHED = 'pairing_cap_reached'` to `WalletTxnSource` | No enum to differentiate cap events from manual admin flushes |
| `wallet.service.ts` `recordFlush` | Added optional `source` param (default: `PAIRING_FLUSH`) | All flush records used `PAIRING_FLUSH` regardless of cause |
| `pairing.service.ts` cap-exhausted branch | `source: PAIRING_CAP_REACHED`, note changed to "Pairing cap reached — points cleared" | Showed wrong label when cap was hit mid-cycle |
| `pairing.service.ts` cap-hit-during-pairing flush | `source: PAIRING_CAP_REACHED`, note changed to "Pairing cap reached — excess cleared" | Same wrong label; excess discard is also a cap event |
| `Transactions.tsx` `payoutTypeConfig` | Added `pairing_cap_reached` entry (red badge, "Pairing Cap Reached") | Type was unknown → transaction silently dropped from list |
| `Transactions.tsx` `SOURCE_MAP` | Mapped `pairing_cap_reached` source → `pairing_cap_reached` type | — |
| `Transactions.tsx` amount display | Flush/cap types show `N pts` (orange) not `₱N` | Points count (e.g. 9 = L+R) was rendered as "₱9" — implied PHP earned/lost |
| `Transactions.tsx` `totalCompleted` | Excluded `pairing_flush` and `pairing_cap_reached` from PHP total | Points count was added to the "Total Completed ₱" stat, inflating it |
| `Transactions.tsx` filter bar | Added "Cap Reached" filter button | No way to filter cap-reached events specifically |
| `Transactions.tsx` legend | Updated "Points Flushed" description; added "Pairing Cap Reached" entry | No legend entry for the new type |

**Cap reset timing (by design — no code change needed):**
The cap is computed via `getDailyCapUsed` which queries `PairingAward` records by `periodKey` prefix (`YYYY-MM-DD-AM` or `YYYY-MM-DD-PM`). When the next AM/PM window starts, the prefix changes and the cap starts fresh at 0 — no carry-over. This is already correct.

**Do NOT add scheduled bucket flushes (`amCycleFlush` / `pmCycleFlush`) back to `pairing.scheduler.ts`.** These were removed because points must persist in buckets until paired or the daily cap is exhausted. A scheduled flush at midnight/noon would wipe all accumulated unmatched volume, causing users to lose valid points. The `flushAllAvailablePoints` method still exists for manual/admin use only.

**Changes made (2026-06-02) — Payout form conditional fields, leadership direct-only, profile picture fix, admin table mobile:**

### Payout form — payment method drives account fields

Bank Transfer option and Instructions/Notes textarea removed. Account fields are now conditional on payment method:

| Payment method | Fields shown |
|----------------|--------------|
| Cash | None (amount + method only) |
| GCash (`wallet`) | GCash Name, GCash Number |
| Paymaya (`crypto`) | Paymaya Name, Paymaya Number |

**Do not add a catch-all account name/number for cash.** Cash requests have no account details by design.

The frontend submit handler only includes `accountName` and `contactNumber` in the POST body when `paymentMethod === 'wallet' || 'crypto'` — cash submissions omit them entirely to avoid `forbidNonWhitelisted` validation errors.

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `Payout.tsx` | Removed `bank` option and `notes` textarea; added `ACCOUNT_LABELS` map; conditionally renders name+number fields based on method | Bank transfer stored as `cash`; notes field was unused dead weight |
| `Payout.tsx` submit handler | Only spreads `accountName`/`contactNumber` when `needsAccount` is true | Sending empty `contactNumber` for cash triggered NestJS `forbidNonWhitelisted` 400 error |
| `Payout.tsx` history display | Added `PAYMENT_METHOD_LABELS` map + `formatPaymentMethod()`; applied to mobile card and desktop table | Raw values `wallet`/`crypto` were shown instead of "GCash"/"Paymaya" |
| `withdrawal.service.ts` `submitRequest` | `accountName` required check skips when `paymentMethod === 'cash'` | Cash submissions correctly rejected before when no account name was provided |
| `withdrawal.service.ts` `format()` | Added `contactNumber: doc.contactNumber ?? ''` to returned object | `contactNumber` was saved to DB but never included in API responses — admin saw "—" in Contact column |

### Leadership bonus — direct referrals only, not spillover

Leadership base is now computed from `User.sponsorId` (direct recruits) instead of `GenealogyNode.ancestors` (full binary subtree including spillover).

**Why this matters:** A user placed under you by someone else (spillover) is in your binary tree, but you did not recruit them. Their pairing earnings should not contribute to your leadership bonus. Only people who registered using your referral link (`sponsorId === yourId`) count.

**If a user has zero direct referrals** (all downline is spillover), `directReferralIds.length === 0` → `totalPhp = 0` → no leadership bonus is credited regardless of tree volume.

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `leadership.service.ts` | Replaced `getDownlineUserIds` (ancestors lookup on `GenealogyNode`) with `getDirectReferralUserIds` (`User.find({ sponsorId: userId })`) | Spillover members incorrectly boosting upline's leadership bonus |
| `leadership.module.ts` | Removed `GenealogyNode` schema import and `MongooseModule.forFeature` entry | Unused dependency — clean module boundary |

### Profile picture replacement — body limit + file input reset

Two separate bugs caused "cannot change profile picture after setting it once":

1. Express's default 100KB JSON body limit silently rejected base64-encoded image PATCHes. The old catch block still did an optimistic UI update, so users thought the change worked until they refreshed.
2. File input `onChange` stopped firing in some browsers after the first selection because the input element wasn't properly reset.

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `backend/src/main.ts` | `bodyParser: false` + custom `express.json({ limit: '10mb' })` and `express.urlencoded({ limit: '10mb' })` | Base64 profile images (~500KB+) were silently rejected with 413; optimistic UI hid the failure |
| `ViewMyAccount.tsx` | Added `fileInputKey` state; file `<input>` gets `key={fileInputKey}`; key increments on confirm/cancel/reselect | `onChange` not firing on repeated file selections in some browsers — key forces full remount |
| `ViewMyAccount.tsx` | `handleConfirmPhoto` catch block now sets `photoError` (keeps modal open showing error) instead of silently updating UI | User never knew the save failed; thought photo changed when it didn't |
| `ViewMyAccount.tsx` | `ChangePhotoModal` accepts `saving` and `error` props; buttons disabled while saving; error banner shown in modal | No user feedback during save or on failure |

**Do not revert the 10MB body limit in `main.ts`.** The default 100KB limit will break profile photo uploads silently.

### PendingPayouts — mobile card view

The admin pending payouts table was a single responsive table with most columns hidden below `lg`. On mobile only DATE, REQUESTED, and ACTIONS were visible — METHOD, ACCOUNT, CONTACT, VAT, and STATUS were all hidden.

| Location | Change |
|----------|--------|
| `PendingPayouts.tsx` | Added `block sm:hidden` card list (all fields visible in 2-column grid per record, full-width action buttons) and `hidden sm:block` desktop table. Contact and VAT still hidden until `lg` on desktop only. |

**Changes made (2026-06-14) — Payout: one-request-only UX, immediate balance deduction visibility:**

### Payout — one active request enforced, balance deducted on submit

The backend already debits the wallet immediately when `submitRequest` is called (not on approval) and blocks a second pending request per currency. The frontend UX was not reflecting this — the form always showed blank on desktop even with a pending request, and there was no indication that the balance locks on submit.

**Rule: a user may have at most one pending payout request at a time. Their wallet balance is deducted the moment they submit, not when admin approves.**

| Payment state | Desktop sidebar shows | Mobile button label |
|---|---|---|
| No pending request | Empty new-request form | "+ Withdraw" |
| Pending request exists (not editing) | Summary panel (amount, to-receive, method, status) + "Update Payout Request" button | "Update Request" → opens form pre-filled |
| Editing pending request | Pre-filled update form | (bottom sheet in edit mode) |

**Do not revert the desktop sidebar to always showing a blank form.** Showing an empty form when a pending request exists misleads users into thinking they can submit a second one.

**Do not remove the immediate-deduction notice from the new-request form.** Users were unaware their balance would be locked on submit rather than on approval.

| Location | Change | Bug / confusion prevented |
|----------|--------|--------------------------|
| `Payout.tsx` desktop sidebar | When `pendingRequest && !editingId`: renders a pending-request summary panel (amount, to-receive, method, status badge) with an "Update Payout Request" button; otherwise renders the form | Blank form showed even when a request existed — users tried to submit again |
| `Payout.tsx` mobile header button | Label becomes "Update Request" and calls `startEdit(pendingRequest)` directly when a pending request exists; otherwise opens blank form | Users opened an empty form, filled it out, hit submit, then got a confusing modal |
| `Payout.tsx` `WithdrawalForm` | Added amber notice banner at top of new-request form: "Balance deducted immediately — your wallet balance will be locked the moment you submit this request." Banner hidden when `isEditing`. | No prior indication that deduction happens at request time, not approval time |
| `Payout.tsx` limit error modal | Heading changed to "Only one request allowed"; body explains deduction already happened; CTA changed to "Update My Payout Request" | Old modal was generic and didn't explain why or what the user should do |
| `Payout.tsx` Available Balance stat sub-label | Changed from "Ready to withdraw" → "Deducted on request" | Old label implied no deduction had occurred yet |

**Backend behavior (unchanged — correct as-is):**
- `submitRequest`: blocks if a `PENDING` record already exists for that userId+currency; creates record then immediately calls `walletService.debit` with `refKey: withdrawal:<id>`
- `updateRequest`: credits back the old locked amount then debits the new amount; effective available = `currentBalance + doc.amount`
- `approve`: wallet was already debited at request time — only marks `COMPLETED`; no debit at approval
- `reject`: calls `walletService.credit` with `refKey: withdrawal-refund:<id>:reject` to return the locked funds

**Changes made (2026-06-15) — Lifestyle Rewards items, UnilevelProducts cleanup, and Stairstep Program:**

### Lifestyle Rewards — 8 items added

`unilevel.lifestyle.rewards.json` now contains all 8 reward tiers. All 8 reward images are imported and mapped in `UnilevelProducts.tsx` via `rewardImages`.

| PV Cost | Reward | ID |
|---------|--------|----|
| 8 | Eat All You Can | `lr-001` |
| 25 | Staycation for 2 | `lr-002` |
| 60 | Android Phone | `lr-003` |
| 250 | Macbook | `lr-004` |
| 500 | Motorcycle | `lr-005` |
| 5,000 | Sedan Car | `lr-006` |
| 10,000 | SUV Car | `lr-007` |
| 25,000 | House and Lot | `lr-008` |

### UnilevelProducts — Redemption History removed; coupon images added

- Removed the "Redemption History" table from `LifestyleRewardsPanel` — it was redundant with the "My Coupons" tab.
- `MyCouponsPanel` coupon cards now show a reward image (looked up by matching `rewardName` → `rewards` state → `rewardImages[reward._id]`). Falls back to a violet gradient placeholder with the category name if no image is mapped.

**Do not re-add the Redemption History table to `LifestyleRewardsPanel`.** The My Coupons tab is the canonical location for redeemed coupons.

### Stairstep Program — new tab (`StairstepProgram.tsx`)

Pure frontend ranking display — no backend schema changes. Rank is computed client-side from data already fetched by the dashboard (`/users/referral-data` for direct sponsor count, `/users/income` for `totalIncome`).

**Rank table (both requirements must be met simultaneously):**

| Rank | Title | Direct Sponsors | Accumulated Income |
|------|-------|----------------|--------------------|
| 5 | Distributor | 0 | ₱0 (no requirements) |
| 4 | Rising Star | 10 | ₱99,000 |
| 3 | Elite Builder | 20 | ₱299,000 |
| 2 | Diamond Executive | 35 | ₱599,000 |
| 1 | Global Ambassador | 60 | ₱1,000,000 |

**Key behaviors:**
- `getCurrentRank` iterates ranks from highest (1) to lowest (5) and returns the first one where both `directSponsors` and `totalIncome` thresholds are met.
- Progress bars show advancement toward the next rank for each metric independently.
- If both bars are 100%, a prompt to "contact your admin to upgrade" is shown — rank assignment is a manual admin action.
- Ranks are displayed with expand/collapse to reveal requirements (with live "you have X" comparisons) and benefits.
- Rank 1 (Global Ambassador) shows a "highest rank achieved" message instead of a progress section.

**Wired into `userDashboard.tsx`:**
- Import: `StairstepProgram` added
- Menu item: `{ id: 'stairstep', label: 'Stairstep Program', icon: Trophy }`
- Tab content: `'stairstep': <StairstepProgram />`

**Do not add backend persistence for the computed rank** — rank is derived from existing income and referral data; storing it separately would create a sync problem. If the business decides ranks should be manually assigned by admin (overriding computed values), add a `rank` field to the User schema and an admin endpoint at that point.

**Changes made (2026-06-22) — Pairing topline bonus: sponsor-only, no ancestor cascade:**

### Pairing topline bonus — direct sponsor only, not all binary ancestors

The 5% "leadership" topline bonus was being recursively cascaded up the **entire binary ancestor chain** whenever any pairing fired. Every ancestor — including those who placed the pairing user via spillover and never personally recruited them — received 5% of the pairing payout. This was wrong.

**Correct rule:** Only the direct **sponsor** of the pairing user (the person who recruited them via referral link, i.e., `User.sponsorId`) receives the 5% topline bonus from that user's pairing. Binary tree ancestors who did not recruit the pairing user earn nothing from it.

**Why the old code was wrong:**
- `cascadeToParent` used `GenealogyNode.parentUserId` (binary placement parent) and recursed up the full chain
- Binary placement can be spillover — the parent did not necessarily recruit the child
- Every ancestor in the entire tree earned 5% of every pairing anywhere below them

**What changed:**

| Location | Change | Bug prevented |
|----------|--------|---------------|
| `pairing.service.ts` `cascadeToParent` | Replaced `GenealogyNode.parentUserId` lookup + recursion with a single `User.sponsorId` lookup; no recursion | All binary ancestors (including spillover placements) were incorrectly earning 5% from pairings of users they did not personally recruit |
| `pairing.service.ts` `cascadeToParent` | Removed the `GenealogyNode` query and `leg` (VolumeLeg) meta field — only `User.sponsorId` is looked up | Unnecessary DB query; `leg` was only relevant for volume, not the cash credit |

**Do NOT revert to the recursive `GenealogyNode.parentUserId` cascade.** Binary ancestors who received the child through spillover are not entitled to the topline bonus. The bonus is tied to the sponsorship (recruiting) relationship, not to binary tree position.

### CORS
Backend allows: `https://co-profit-global.vercel.app`, `https://coprofit-global.com`, `https://www.coprofit-global.com`, `http://localhost:5173`. Credentials are enabled for cookie handling.
