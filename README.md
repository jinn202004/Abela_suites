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
