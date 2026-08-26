# Snapshot: codeia-v2 Popup system (reference for @modularcore/modals)

Frozen extraction of the rules `@modularcore/modals` adapted from
`/Volumes/EVO990/Proyectos/Personales/Codeia/CodeIA NextJS/codeia-v2/`, so correctness can be
verified without access to that external repo. Sourced during the plan's research/red-team pass
(2026-08-25) plus direct reads during implementation. This is a documentation snapshot only — no
code from codeia-v2 is copied into this package.

## Files read directly during implementation

- `apps/web/components/shared/popup-manager.tsx` — client-side manager: slots per visual type
  (`modal`/`topBanner`/`bottomBanner`/`slideIn`), `PopupData` shape, `getSessionId()` via
  `sessionStorage`, `MAX_WIDTH_MAP`, `slotKey(type)` mapping `MODAL`/`FULLSCREEN` → `'modal'`.
- `apps/web/app/(admin)/admin/popups/page.tsx` — admin list query: fields selected
  (`type`, `triggerType`, `frequency`, `isActive`, `priority`, `pages`, `excludePages`,
  `showToGuests`, `showOnce`, `showCloseButton`, `bgColor`, `textColor`, `maxWidth`, `startDate`,
  `endDate`, `_count: { views, interactions }`), ordered by `priority desc, createdAt desc`.

## Fields → `ModalConfig` (core/types.ts) mapping

| codeia `Popup` field | `ModalConfig` field | Notes |
|---|---|---|
| `type: MODAL\|TOP_BANNER\|BOTTOM_BANNER\|SLIDE_IN\|FULLSCREEN` | `type: 'modal'\|'top-banner'\|'bottom-banner'\|'slide-in'\|'fullscreen'` | + added `'toast'` (not in codeia) |
| `triggerType: PAGE_LOAD\|DELAY\|SCROLL\|EXIT_INTENT\|CLICK\|MANUAL` | `trigger.type` | kept as-is (kebab-cased) |
| `frequency: ALWAYS\|ONCE_PER_SESSION\|ONCE_PER_DAY\|ONCE_EVER` | `frequency` | kept as-is; evaluated **client-side** here (no DB) — see `docs/frequency-client-side.md` |
| `title`, `message`, `imageUrl` | same | `message` untrusted by default (RT-S2) |
| `primaryButtonText`/`primaryButtonUrl`, `secondaryButtonText`/`secondaryButtonUrl` | `primaryButton`/`secondaryButton: { text, url }` | grouped into one object each |
| `showCloseButton` | `showCloseButton` | same default (`true`) |
| `bgColor`, `textColor` | `bgColor`, `textColor` | validated via `ui/safe/style.ts#safeColor` before use (RT-S5) — codeia trusts admin input directly, this package does not trust the provider |
| `maxWidth: string` | `maxWidth: closed enum` | codeia used a free string mapped via `MAX_WIDTH_MAP`; this package closes the enum at the type level (RT-S5) |
| `priority` | `priority` | same semantics: higher wins the slot |
| `pages`, `excludePages` | `targeting.pages`, `targeting.excludePages` | same matching semantics (see below) |
| `startDate`, `endDate` | `startDate`, `endDate` | same semantics |
| `isActive` | `isActive` | same |
| `_count.views` / `_count.interactions` | N/A | codeia persists counts server-side; this package only exposes `trackView`/`trackInteraction` hooks (no counting) |
| `showToGuests`, `targetRoles`, `showOnce`, `PopupPosition`, `PopupButtonAction` | — (omitted) | not used anywhere in the read source; YAGNI (documented as Non-Goals in `plan.md`) |
| `PopupView` table (server-side "was this shown" check) | `FrequencyStore` (`core/frequency.ts`) | re-implemented **client-side** — the key architectural divergence (no DB in this package) |

## Rules re-implemented (not copied) into this package

- **Targeting** (`core/eligibility.ts#matchesTargeting`): `pages` empty → match all; `'/'` matches
  only exact root; other entries match via `startsWith`; `excludePages` wins over an include
  match. Modeled after codeia's route-matching helper (referenced in the plan's research as
  `route.ts` around lines 60-67/71-104) — re-derived and covered by this package's own tests
  (`test/core/eligibility.test.ts`), not dependent on reading that file again.
- **Trigger scheduling** (`core/triggers.ts#scheduleTrigger`): `page-load`/`delay` →
  `setTimeout`; `scroll` → percent-of-page threshold; `exit-intent` → `mouseout` with
  `clientY <= 0` (desktop-only); `click`/`manual` → no auto-fire. Modeled after
  `popup-manager.tsx`'s trigger-detection logic (plan's research cited it around lines 340-389)
  — re-implemented with an injectable `TriggerEnvironment` (this package has no DOM access
  outside that seam) and covered by `test/core/triggers.test.ts`.
- **Frequency** (`core/frequency.ts`): 4 rules re-implemented client-side per the mapping table
  above; codeia's Prisma model (`schema.prisma`, cited in the plan's research around lines
  2519-2559) was read only to extract field names/semantics, never to copy Prisma code.

## Divergences (all intentional, documented elsewhere in this package)

1. Frequency: server-side + DB (codeia) → client-side + Storage API (this package). See
   `docs/frequency-client-side.md`.
2. `bgColor`/`textColor`/`maxWidth`: trusted admin input (codeia) → validated/closed-enum,
   provider treated as untrusted (this package). See `core/provider.ts`'s security docstring.
3. Added `type: 'toast'` (multi-instance stack; not present in codeia's `PopupType`).
4. No admin CRUD, no Prisma schema, no API routes shipped (this package is provider-agnostic
   headless-core + adapters only — see `plan.md`'s Non-Goals).
