# Changes — 2026-10-20 / 2026-10-21

A guide to every change made in this round. Use it to re-apply the work by hand. Each section covers the business rule, the files involved, what changed, and the key code.

Files touched:

| Area | Files |
|---|---|
| Backend | `withdrawal/withdrawal.service.ts`, `withdrawal/withdrawal.controller.ts`, `withdrawal/schemas/withdrawal-request.schema.ts`, `withdrawal/dto/create-withdrawal.dto.ts`, `pairing/pairing.service.ts`, `unilevel-products/unilevel-products.service.ts`, `admin/admin.controller.ts`, `admin/admin.service.ts`, `admin/dto/generate-product-pin.dto.ts`, `users/users.controller.ts` (all under `backend/src/modules/`) |
| Frontend | `sections/tabs/Payout.tsx`, `PendingPayouts.tsx`, **`PayoutReport.tsx` (new)**, `WithdrawGC.tsx`, `PendingWithdrawGC.tsx`, `GenerateProductPin.tsx`, `Transactions.tsx`, `ViewMyAccount.tsx`, `UsersOverview.tsx`, `OrderOnline.tsx`, `sections/admin/adminDashboard.tsx` (all under `frontend/src/`) |
| Docs | `CLAUDE.md` (new 2026-10-20 section; the 2026-06-14 "one request only" section marked superseded) |

No new packages. No database migration is needed. The new `processedBy` field defaults to `null`, and the new index builds automatically.

---

## 1. Payout Report (admin financial report)

**Rule:** The admin can see every payout transaction. Each one shows who requested it, when it was requested (date and time), and when and by which admin it was processed, so it can be traced.

### Backend

**`withdrawal/schemas/withdrawal-request.schema.ts`** — add the audit field and an index:

```ts
  // Admin who approved/rejected the request — audit trail for the payout report.
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  processedBy: Types.ObjectId | null;
```
```ts
WithdrawalRequestSchema.index({ currency: 1, createdAt: -1 });
```

**`withdrawal/withdrawal.service.ts`**
- `approve(withdrawalId, adminId, adminNote)` and `reject(withdrawalId, adminId, adminNote)` now take `adminId` and set `doc.processedBy = this.toObjectId(adminId)`.
- `getAllRequests(status?, currency?, from?, to?)`:
  - The date filter uses Philippine time (`+08:00`):
    ```ts
    if (from) createdAt.$gte = new Date(`${from}T00:00:00.000+08:00`);
    if (to)   createdAt.$lte = new Date(`${to}T23:59:59.999+08:00`);
    ```
  - Populates the requester and the processing admin:
    ```ts
    .populate('userId', 'name username email contact')
    .populate('processedBy', 'name username')
    ```
- `format()` now returns `user: { name, username, email, contact } | null`, `processedBy: { id, name, username } | null`, and `updatedAt`. It detects populated docs with `doc.userId?.username !== undefined`.
- Use `rows.map((r) => this.format(r))` rather than `rows.map(this.format)`.

**`withdrawal/withdrawal.controller.ts`**
- Admin routes are now admin-only. Before this change, any logged-in user could call them.
  ```ts
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  allRequests(@Query('status') status?, @Query('currency') currency?, @Query('from') from?, @Query('to') to?)
  ```
  The same guards go on `PATCH :id/approve` and `PATCH :id/reject`. Both pass `req.user.sub` as the admin id.
- New imports: `Roles` from `../auth/roles.decorator`, `RolesGuard` from `../auth/roles.guard`, and `SystemRole` from `../users/schemas/user.schema`.

### Frontend

**New `sections/tabs/PayoutReport.tsx`**
- Fetches `GET /withdrawal/all?currency=php[&status][&from][&to]`.
- Filters: a search box (requester, account, or admin), a status dropdown, and from/to date inputs.
- Summary cards:
  - Transactions
  - Net Paid Out: the sum of `totalAmount` for completed requests
  - Pending
  - Fees Collected: `vat + ₱50`, counting completed and pending requests only
- Table columns: Requested (date + time to the second), Requester, Method / Account, Amount, Fees, Net Payout, Status, Processed (date + time), Processed By. A cancelled request shows "Cancelled by user".
- CSV export uses a BOM (`String.fromCharCode(0xfeff) + csv`) so Excel reads the ₱ sign correctly. Don't paste a literal BOM character, because ESLint's `no-irregular-whitespace` rejects it.
- On mobile, the table becomes a card list.

**`sections/admin/adminDashboard.tsx`**
```ts
import { ..., FileText } from 'lucide-react';
import PayoutReport from '../tabs/PayoutReport';
{ id: 'payoutReport', label: 'Payout Report', icon: FileText },   // after Pending Payouts
'payoutReport': <PayoutReport />,
```

**`sections/tabs/PendingPayouts.tsx`**
- Added `user?: { name; username } | null` to the record type.
- Added a **Requester** column to the desktop table, with `colSpan` going 9 → 10, and a Requester row on the mobile card.
- "Total Amount Held" now sums `amount` instead of `totalAmount`. Its sub-label now shows the fees: `totalVat + count × ₱50`.

---

## 2. Minimum payout is ₱500

- Backend `withdrawal.service.ts`:
  ```ts
  const VAT_RATE = 0.10;
  const ADMIN_FEE_PHP = 50;
  const MIN_PHP_PAYOUT = 500;
  ...
  if (currency !== WalletCurrency.GC_POINTS && dto.amount < MIN_PHP_PAYOUT) {
    throw new BadRequestException(`Minimum payout request is ₱${MIN_PHP_PAYOUT}`);
  }
  ```
- Frontend `Payout.tsx`: `const MIN_PAYOUT = 500;`. It sets the input's `min`, the placeholder, and the inline error. The submit button is disabled while the available balance is under ₱500.

## 3. Multiple payout requests, 10% + ₱50 fee each

- Removed the "single active request guard" (`findOne({ userId, currency, status: PENDING })`) from `submitRequest`.
- The fee is unchanged and applies per request: `vat = floor(amount × 10%)` and `totalAmount = amount − vat − ₱50`.
- The amount is still debited **immediately on submit**. If the debit throws (for example, two requests at once drain the balance), the request record is deleted so no request is left without a matching debit:
  ```ts
  try { await this.walletService.debit({...}); }
  catch (err) { await this.withdrawalModel.deleteOne({ _id: request._id }); throw err; }
  ```

## 4. No Edit / Update on payout requests

- Backend: deleted `updateRequest()` from the service and the `PATCH /withdrawal/:id` route from the controller. Users can still cancel (`PATCH /withdrawal/:id/cancel`), which refunds the amount.
- Frontend `Payout.tsx` was rewritten:
  - Removed `editingId`, `startEdit`, `showLimitModal`, the "Pending Request" summary panel, the "Update Payout Request" and "Cancel Edit" buttons, and the "Only one request allowed" modal.
  - The desktop sidebar always shows the new-request form.
  - The mobile button always says "+ Withdraw".
  - The amber notice explains the immediate deduction, the per-request fees, and the ₱500 minimum.
  - The form shows a live breakdown: amount deducted, net payout, and balance after the request.
  - History now has a **Fees** column and a per-row **Cancel** link on pending requests, with a `window.confirm` prompt.
  - History fetch changed to `/withdrawal/my?currency=php`. Before this, GC withdrawals were mixed into the PHP history.
  - Stat sub-labels: "N requests — already deducted" and "Pending requests already subtracted".

## 5. GC requests: quantity, name, extra fields

**Backend `withdrawal.service.ts` → `computeAndValidate`** (GC branch):
```ts
if (!accountName) throw new BadRequestException('Full name is required');
if (!dto.contactNumber?.trim()) throw new BadRequestException('Contact number is required');
```
The GC debit note now includes the name. In **`dto/create-withdrawal.dto.ts`**, `notes` gets `@MaxLength(500)`.

**Frontend `WithdrawGC.tsx` (user side)**
- New state: `fullName`, `contactNumber`, `notes`. On mount, the first two are prefilled from `GET /users/me` (`name`, `contact`).
- Fields:
  - Quantity (GC), whole numbers only, no more than the balance
  - Full Name (required)
  - Contact Number (required)
  - Notes (optional, max 500 characters)
- POST body: `{ amount, currency: 'gc_points', accountName, contactNumber, notes? }`.
- Bug fix: the form was an inner component (`const WithdrawalForm = () => ...`). React remounted it on every render, so the input lost focus after each keystroke. It's now a JSX value (`const withdrawalForm = (...)`), used as `{withdrawalForm}`.

**Frontend `PendingWithdrawGC.tsx` (admin side)** was rewritten:
- Columns: Requester (name + @username), Quantity (GC), Claimant / Contact (falls back to the account's name and contact on older requests), Notes, Requested (date + time), Actions.
- Mobile card layout.
- Approve and Decline share one `handleAction(id, 'approve' | 'reject')` with a busy state.

## 6. Leadership bonus: 1st level only

**Already implemented. No code change.** `pairing.service.ts → cascadeToParent()` credits 5% of the pairing payout to the direct sponsor (`User.sponsorId`) only, with no recursion. In practice: Bronze ₱400 → ₱20, Silver ₱1,200 → ₱60, Gold ₱1,600 → ₱80, Platinum ₱2,400 → ₱120.
Only the description text was updated, in the `Transactions.tsx` legend.

## 7. Repeat Binary PV values

| Product | PV |
|---|---|
| 100ml perfume | 1 |
| 60ml perfume | 0.50 |
| 10ml perfume | 0.10 |
| 5ml vial | 0.05 |
| RelieFleX 60ml | 0.25 |
| 10ml roll-on | 0.10 |
| Coffee Barley | 0.50 |
| Choco Barley | 0.50 |
| BiramaXXX | 0.50 |
| Liptint & Serum | 0.10 |
| Viz-ionz | 0.25 |

These values were already in `frontend/src/sections/tabs/json/unilevel.products.data.json`.

**`pairing/pairing.service.ts`**: 1 PV = 1 point = one ₱400 pair. It used to be 80 PV per point.
```ts
private readonly PV_PER_REPEAT_BINARY_POINT = 1;
...
if (userPV < this.PV_PER_REPEAT_BINARY_POINT) return { skipped: true, ... };
const userPvPoints = Math.floor(userPV / this.PV_PER_REPEAT_BINARY_POINT + 1e-9);
const pvToConsume  = pairsCount * this.PV_PER_REPEAT_BINARY_POINT;
```
Also replace every "80 PV" comment with "1 PV".

**`unilevel-products/unilevel-products.service.ts → computeAvailablePv`**: round off float drift so that 10 × 0.10 counts as exactly 1:
```ts
return Math.max(0, Math.round((earned - spent - deducted) * 100) / 100);
```

**Admin product PIN presets**
- `admin/dto/generate-product-pin.dto.ts`: `@IsString() @IsOptional() productName?: string;`
- `admin/admin.service.ts → generateProductPins`: `productName: dto.productName?.trim() ?? ''`. The response also includes `productName`.
- `GenerateProductPin.tsx`:
  - Imports `./json/unilevel.products.data.json` and keeps the active products as `PRODUCT_PRESETS`.
  - Adds a **Product** dropdown that fills in PV and price.
  - Sends `productName` when a preset is selected.
  - Typing into PV or price manually resets the dropdown to "Custom".

> ⚠ Check before going live: PV balances built up under the old 80-PV scale now pay ₱400 per PV. Also, Lifestyle Reward costs and the 1,500 PV leadership qualification use the same PV units.

## 8. Unilevel 1%–5% (levels 1–5)

**Already paid on PIN redemption** (`awardUnilevelLevelBonuses`, rates `[0.01, 0.02, 0.03, 0.04, 0.05]`, walking up the sponsor chain). Example: a ₱288 purchase by your Level 1 pays you ₱2.88. Changes:

- `awardUnilevelLevelBonuses(redeemerUserId, price, refKeyBase, productName = '')`:
  - It now looks up the buyer's username.
  - New note format: `Unilevel Level N bonus (N%) — @buyer purchased <product> ₱<price>`.
  - `meta` now includes `productName`.
- `redeemPin` passes `pinDoc.productName`.
- `approvePurchase` now also pays the level bonuses, using `refKeyBase = purchase:<id>` and `price = doc.totalPrice`. The call is wrapped in try/catch with logging, the same as `redeemPin`.
- **`Transactions.tsx`**: these transactions used to be dropped silently. The fix:
  - Add `'unilevel_bonus'` to the type union.
  - Add a config entry: `{ label: 'Unilevel Bonus', icon: Layers, badge: lime }`.
  - Map the source in `SOURCE_MAP`: `unilevel_level_bonus: 'unilevel_bonus'`.
  - Add a "Unilevel" filter pill.
  - Add legend entries for Unilevel and Repeat Binary, and update the Leadership legend text.

## 9. Users can't change their own name

**Frontend `ViewMyAccount.tsx`**
- New `LockedNameField`: a read-only button with a lock icon. Clicking it opens the new `NameChangeLockedModal` ("Name changes need admin approval… contact the admin"). It replaces the old Full Name `EditField` in the Account Information edit form.
- New state: `showNameLockModal`.
- `saveSection` strips `name` before sending the PATCH:
  ```ts
  const fields: Partial<Profile> = { ...draft };
  delete fields.name;
  ```

**Backend `users/users.controller.ts → PATCH /users/me`**
- `name` is no longer passed to `updateProfile`.
- If `body.name` is sent and differs from the current name → `403 ForbiddenException('...Please contact the admin to request a name change.')`. Resending the same name is allowed.
- Added `ForbiddenException` to the imports.

**Admin rename**
- `admin/admin.controller.ts`: `@Patch('users/:id/name') changeUserName(@Param('id') id, @Body() body: { name: string })`.
- `admin/admin.service.ts`: `changeUserName(userId, name)`. It validates the ObjectId, requires at least 2 characters after trimming, and runs `updateOne({ $set: { name } })`.
- `UsersOverview.tsx`:
  - A **Change Name** button in the user detail modal, via the new `onChangeName` prop.
  - State: `changeNameUser`, `newName`, `changeNameLoading`, `changeNameError`.
  - Functions: `openChangeName`, `closeChangeName`, `handleChangeName`. On success it updates the user in the local `users` list.
  - A Change Name modal styled like the Change Password modal.

## 10. Order Online: prices shown as SRP

`OrderOnline.tsx` changes the display only. Stored prices and totals are unchanged.
- Product card: `<span class="text-[10px] ... uppercase">SRP</span> {formatPrice(perfume.price)}`
- Cart line: `SRP {item.price}`
- Order history line: `SRP {formatPrice(item.price)} × {item.quantity}`

---

## Verification done

- `backend`: `npx tsc --noEmit`: clean.
- `frontend`: `npx tsc -b`: clean. ESLint shows no new errors; the remaining `any` errors and exhaustive-deps warnings were already there.
- `backend` jest: 2 suites fail (`users.controller.spec`, `users.service.spec`). They fail identically on the code from before these changes, because their test modules are missing mocks.
- None of this has been tested in the running app.

## Quick re-apply checklist

1. Schema: add `processedBy` and the index.
2. Withdrawal service: constants, remove the single-request guard, debit rollback, delete `updateRequest`, `approve`/`reject` take `adminId`, `getAllRequests` with dates and populate, new `format`, GC name/contact validation.
3. Withdrawal controller: remove `PATCH :id`, add admin guards, pass `req.user.sub`, add `from`/`to` query params.
4. DTOs: `notes` max 500 (withdrawal); `productName` (product PIN).
5. Pairing: `PV_PER_REPEAT_BINARY_POINT = 1`. Unilevel: round available PV, bonus note/product, bonus on `approvePurchase`.
6. Users controller: block name changes. Admin: `PATCH users/:id/name`.
7. Frontend: Payout rewrite, PayoutReport plus dashboard wiring, PendingPayouts requester, WithdrawGC fields, PendingWithdrawGC rewrite, GenerateProductPin presets, Transactions unilevel type, ViewMyAccount locked name, UsersOverview Change Name, OrderOnline SRP labels.
8. Update `CLAUDE.md`, so nobody restores the old "one request only" rule.
