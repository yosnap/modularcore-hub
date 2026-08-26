# Client-side frequency capping (vs. codeia-v2's server-side model)

`@modularcore/modals` has no database and no built-in backend (see `core/provider.ts`), so
frequency capping (`always` / `once-per-session` / `once-per-day` / `once-ever`) is evaluated and
persisted **client-side**, in `core/frequency.ts` + `core/storage.ts`, instead of server-side.

## Reference product (codeia-v2)

codeia-v2's `Popup` system persists a `PopupView` row per (popup, session) in Postgres via
Prisma, and its route handler queries that table on every request to decide whether a popup was
already shown before including it in the response. The frequency decision is made **before** the
client ever sees the popup.

## This package's model

- `core/storage.ts` wraps `sessionStorage`/`localStorage` behind a `KeyValueStorage` interface,
  probe-detected (falls back to in-memory when unavailable — private browsing, SSR, quota).
- `core/frequency.ts`'s `FrequencyStore` reads/writes a `modals:shown:{id}` key per rule:
  - `once-per-session` → `sessionStorage`, cleared when the tab closes.
  - `once-per-day` → `localStorage`, blocks for 24h (in milliseconds, not calendar-day) from the
    last shown timestamp.
  - `once-ever` → `localStorage`, blocks permanently once shown.
- `core/eligibility.ts`'s `filterEligible` calls `store.isBlocked` as the last filter, so the
  manager (`core/modals.ts`) never even schedules a trigger for a config the frequency store
  already says was shown.

## Why this is safe to diverge on

The provider (`getActiveModals`) is still the source of truth for *what exists*; frequency only
decides *whether to show it again on this device*. A consumer that genuinely needs
cross-device/authoritative frequency (e.g. "never more than once per logged-in user, from any
browser") should encode that in its own `ModalsProvider.getActiveModals()` — e.g. server-side
excluding configs the current user has already seen — and can leave this package's client-side
capping as an additional, redundant guard.
