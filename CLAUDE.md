# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoProfitGlobal is a network marketing platform with genealogy tree management, binary volume tracking, multi-tier commission calculations, and a wallet/payout system. It is a monorepo with separate `frontend/` and `backend/` directories.

## Commands

### Backend (NestJS — run from `backend/`)
```bash
npm run start:dev       # development with hot reload (port 3000)
npm run build           # compile TypeScript via nest build
npm run start:prod      # run compiled dist/main.js
npm run lint            # eslint with auto-fix
npm run test            # jest unit tests
npm run test:e2e        # end-to-end tests
npm run test:cov        # coverage report
npx ts-node src/scripts/seed-admin.ts  # seed admin user
```

### Frontend (React+Vite — run from `frontend/`)
```bash
npm run dev             # vite dev server (port 5173)
npm run build           # tsc -b && vite build
npm run lint            # eslint
npm run preview         # preview production build
```

## Architecture

### Stack
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS 4, React Router v7, Recharts, Axios
- **Backend**: NestJS 11 + TypeScript, MongoDB/Mongoose, Passport-JWT, NestJS Schedule

### Backend (`backend/src/`)
All business logic lives in `modules/`. Each module follows NestJS conventions: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts`, and DTOs.

Key modules:
- **auth** — JWT login/register, refresh token rotation (httpOnly cookies), multi-device session tracking
- **users** — User schema with roles (`USER`/`ADMIN`) and membership tiers (`FREE`, `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`)
- **genealogy** — Binary tree placement; handles left/right leg assignments, direct/indirect referral bonuses based on tier
- **volume** — Dual-leg volume buckets (left/right) per user per period; feeds binary income calculation
- **wallet** — Transaction ledger supporting multiple income sources (pairing, sign5, leadership, referral, etc.)
- **pairing** — Pairing bonus computation across legs
- **leaderboard / leadership / sign5** — Award and ranking systems
- **withdrawal** — Withdrawal request lifecycle
- **periods** — System-wide active period management (used by volume, pairing, etc.)
- **product-pins / unilevel-products** — Product inventory and activation logic

### Frontend (`frontend/src/`)
- **`contexts/AuthContext.tsx`** — Global auth state; stores access token in localStorage, expiry, user info
- **`lib/apiFetch.ts`** — Axios wrapper with automatic access-token refresh; triggers `SessionExpiredModal` on final failure
- **`App.tsx`** — Route definitions and `AuthProvider` / `CartProvider` wrappers
- **`sections/`** — Page-level components organized by role:
  - `landingSections/` — Public landing page and cart
  - `authentication/` — Login and register flows
  - `user/userDashboard` — Main authenticated user UI
  - `admin/adminDashboard` — Admin panel
  - `tabs/` — Sub-tabs rendered inside dashboards (Genealogy, Pairing, Payout, Transactions, etc.)

### Authentication Flow
1. Login returns an access token (short-lived) and sets a refresh token cookie (httpOnly).
2. `apiFetch` intercepts 401 responses, calls `/auth/refresh`, and retries the original request.
3. On refresh failure, `SessionExpiredModal` is shown and the user is logged out.
4. The backend `JwtAuthGuard` + `RolesGuard` protect routes; role decorators (`@Roles(Role.ADMIN)`) gate admin endpoints.

### Environment Variables
- **Backend** (`.env`): `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `BCRYPT_SALT_ROUNDS`, `PORT` (default 3000)
- **Frontend** (`.env`): `VITE_API_BASE_URL` (e.g., `http://localhost:3000`)

### CORS
Backend allows: `https://co-profit-global.vercel.app`, `https://coprofit-global.com`, `http://localhost:5173`. Credentials are enabled for cookie handling.
