# React + JavaScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, consider adding `eslint-plugin-react` for React-specific rules and tightening the recommended rules in `eslint.config.js` as needed.

---

## Abela — Front desk dashboard

**Files:** `src/frontdesks/dashboard.jsx`, `dashboard.service.js`, `dashboard.css`; `frontdesk-dashboard.jsx` re-exports for `/frontdesk-dashboard`.

**Layout:** Four summary cards (today’s reservations & check-outs, billing total, outstanding balance), **Room Status** / **Event Status** tabs, search, and inventory table — matching the classic front desk screen.

**Endpoints:** `GET /api/frontdesk/summary` (card metrics from MongoDB, same rules as bookings + billing), `GET /api/rooms` (room status table), `GET /api/event-venues` (event status table), `GET /api/frontdesk/bookings/:id` (booking modal).

**Refresh:** Toolbar button + 60s auto-refresh + listeners for auth and cross-tab pings.

---

## Abela — ADMIN_1 Cashier / Bills (`src/admin_1/bills.jsx`)

**Purpose:** Staff-facing **billing ledger** backed by MongoDB **`billings`** (joined **`bookings`** + **`guests`**). This is the ADMIN_1 “cashier” surface for viewing balances and recording payments.

**Service layer:** `src/api/cashier.service.js`

- `getBilling(page, limit, { type, search })` → **`GET /api/cashier/billing?page=&limit=`** (response shape matches Restaurant Menu pagination: `currentPage`, `totalPages`, `totalItems`, `data`).
- `getBillingById(id)` → **`GET /api/billing/:id`** (full guest / booking / billing bundle).
- `updatePayment(id, amountPaid)` → **`PUT /api/billing/:id/payment`** (`amountPaid` is the **cumulative** total paid).

**Pagination UI:** Same **`rm-pagination-*`** controls as **Restaurant Menu** (previous/next, numeric pages, per-page selector).

**Role behavior (UI + API):** **`cashier`** and **`admin`** can **Pay** (payment modal). **`frontdesk`** is **view-only** on payments (**403** on `PUT` if they bypass the UI). After a successful payment or on a timer while the tab is visible, the page **re-fetches** the current ledger page so totals stay accurate without loading every billing row at once.
