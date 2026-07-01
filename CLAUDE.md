# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # Vite dev server on 0.0.0.0:3000
npm run build      # production build (vite build → dist/)
npm run preview    # serve the production build
npm run lint       # type-check only (tsc --noEmit) — there is no ESLint
npm run clean      # rm -rf dist server.js
```

There is no test runner. `npm run lint` is the only static gate. For ad-hoc checks of the pure
finance engine, write a throwaway `.mts` and run it with `npx tsx file.mts` (the engine functions
are pure and importable in isolation).

If `vite build` fails with "Cannot find native binding" (@tailwindcss/oxide), install the platform
binary explicitly: `npm i @tailwindcss/oxide-linux-x64-gnu` (npm optional-dep bug).

## Origin & environment

Google AI Studio export ("Butchery Control" for a Namibian butchery — currency `N$`), since extended
into a multi-tenant SaaS. Notes:
- `@google/genai` is a dependency but **not imported anywhere** — no AI feature is wired up.
- `vite.config.ts` toggles HMR/file-watching via `DISABLE_HMR` (set by AI Studio). Leave it alone.
- `express`/`server.js` come from the AI Studio deploy template and are unused.
- Env vars are in `.env.local` (gitignored). Vite only exposes vars prefixed `VITE_`. Supabase needs
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. **Without them the app runs "local-only"** (no
  login, acts as admin, localStorage only) — convenient for offline dev.

## Architecture

React 19 + Vite 6 + Tailwind 4 SPA. Provider order (`src/main.tsx`): `AuthProvider` → `DataProvider`
→ `App`. Navigation is a single `view` state in `App.tsx`; each area renders full-screen and unmounts
the others.

### Auth & multi-tenancy (`src/context/AuthContext.tsx`, `src/lib/supabase.ts`)
Supabase email/password auth. **Multi-tenant**: each business is a `company` (tenant) with isolated
data. A user's `profiles` row holds `company_id` + `role` (`admin` | `till`). Signup flows via RPCs:
`create_company` (→ admin of a new company) or `join_company(code)` (→ till of an existing one).
`App.tsx` gating order: loading → spinner; signed-out → `LoginScreen`; signed-in but no company →
`OnboardingScreen`; `role === 'till'` → **only** `TillArea`; else the full admin app.

### Shared data + cloud sync (`src/context/DataContext.tsx`)
`useData()` is the single source of truth for `products`, `sales`, `purchases`, `customers`, and the
`finance` config. It persists to **localStorage** (offline cache) and, when signed in, syncs the
whole snapshot as one JSONB row **per company** in Supabase `business_state`, with realtime updates
across devices (last-write-wins; own echoes ignored via `updated_by`). `recordSale()` is the helper
that completes a sale (appends it, decrements stock, updates the customer's credit balance). Mutations
elsewhere go through the context setters. `mergeFinance()` deep-merges persisted config with
`DEFAULT_FINANCE_CONFIG` so new settings fields always get defaults.

### Finance / reporting engine (`src/finance/`) — the core domain
Mirrors `assets/Namibia_Financial_Model_v8.xlsx` (NAMRA-compliant double-entry model). **Everything
derives from one unified journal**, so to change a statement you usually change how the journal is
built or aggregated, not the statement itself:
- `chartOfAccounts.ts` — 28 accounts (exact name strings are the join keys), NAMRA wear-&-tear rates.
- `journalAdapter.ts` — `buildJournal(pos, config)` turns POS data + `priorYear` opening balances +
  manual entries into double-entry lines. `makeInPeriod(settings)` filters by the report period
  (`periodStart`/`periodEnd`; empty = all dates).
- `engine.ts` — `buildReports(pos, config)` aggregates the journal into Income Statement, Tax Engine
  (NAMRA: add-backs, capital allowances, provisional P1/P2), VAT, Balance Sheet, Cash Flow, Trial
  Balance, Changes in Equity, Debtors Aging, KPIs. Pure & testable.

Accounting model that keeps statements tying: opening balances (`priorYear`) represent the position
at `periodStart`; period flows feed IS/CF/VAT/Tax; Balance Sheet = opening + period movements as at
`periodEnd`. **The Prior Year inputs must be internally balanced** (assets = equity + liabilities) or
the Trial Balance / Balance Sheet checks will (correctly) show out-of-balance. Sales prices are
VAT-inclusive; livestock purchases are treated as zero-rated.

### UI surfaces
`src/components/*Area.tsx` are the screens (Till, Inventory, SalesHistory, Customers, Settings,
Reports). `ReportsArea.tsx` hosts tabbed statements + a manual-input "Setup" tab + a report-period
date picker. `AFSDocument.tsx` is the printable Annual Financial Statements (white-on-black document;
`window.print()` + the `@media print` rules in `index.css` that show only `#afs-print`). User/role
management and invite codes live in `UserManagement.tsx` (Settings → Users); sync status/backup in
`SyncSettings.tsx` (Settings → Sync). The dashboard in `App.tsx` derives its KPIs from `useData()`.

## Supabase backend

SQL lives in `supabase/migrations/` (`0001_init.sql` single-tenant base, `0002_multitenant.sql` the
SaaS rearchitecture — **0002 is destructive/non-idempotent, run once**). Tables: `companies`,
`profiles`, `business_state` (per company), `company_invites`. RLS scopes everything to
`current_company_id()`; `is_admin()` gates role/invite changes. Realtime is enabled on
`business_state`. Migrations are applied via the SQL Editor or the Management API
(`POST https://api.supabase.com/v1/projects/{ref}/database/query`, which sits behind Cloudflare and
**rejects non-browser User-Agents** — send a browser UA).

## Gotchas
- **React 19 + custom-component `key`**: passing `key` to a local component (not an intrinsic element)
  fails type-check here. Wrap mapped custom components in `<Fragment key={…}>` instead.
- Money/dates: dates are revived from ISO strings on load (`reviveDates`); the finance engine rounds
  to 2dp for its balance checks.

**Styling**: Tailwind v4 via `@tailwindcss/vite` (no config file; `@import` in `src/index.css`). Dark
"bento" theme — `#0C0C0C`/`#151515` surfaces, `#262626` borders, `#D42C2C` accent, `#10B981` green.
Icons `lucide-react`. **Import alias `@/*` → repo root.**
