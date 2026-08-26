---
phase: 4
title: "Style-switcher parity pass (shadcn + vanilla polish)"
status: done
priority: P2
effort: "1d"
dependencies: [2, 3]
---

# Phase 4: Style-switcher parity pass (shadcn + vanilla polish)

## Overview

The playground's existing "Estilo del componente" `<select>` (`apps/web/src/routes/playground/media-picker/+page.svelte`, `styleVariant` state) lets a viewer swap between headless/tailwind/shadcn/vanilla live, with `picker` state surviving the swap. Phases 2-3 build all 4 variants of the new `MediaLibraryModal`/`ImageEditor`, but this dedicated pass exists to catch the class of bug the style-switcher makes visible that a single-variant review wouldn't: any prop/behavior drift between variants (e.g. tailwind supports a feature vanilla forgot), and any component that doesn't actually re-render correctly when swapped mid-session (stale DOM refs, leaked object URLs, focus-trap listeners not cleaned up on unmount).

## Requirements

- Functional:
  - Manually exercise the style switcher for every new/changed component (`MediaLibraryModal`, `MediaLibraryGrid`, `ImageEditor`, `RemoteUrlLoader`) across all 4 options, confirming: identical props accepted, identical callback contracts fired, no console errors on switch, no orphaned `URL.createObjectURL` blobs (existing `ImageEditor` pattern already revokes on effect cleanup — confirm the modal restructuring in Phase 3 didn't break that).
  - Confirm shadcn variant's Dialog/Tabs primitives (if a new dependency was introduced in Phase 2) don't visually conflict with `ui/shadcn-theme.css` tokens already established for the existing components.
  - Confirm vanilla variant has no accidental Tailwind class leakage (a common mistake when copy-pasting from the tailwind variant) — grep vanilla files for `class="...tailwind-looking-utility..."` patterns as a smoke check.
- Non-functional:
  - No new abstractions introduced here — this phase is verification + targeted fixes, not new features.

## Architecture

N/A — this is a cross-variant consistency/QA pass, not new architecture. Uses the existing style-switcher pattern in `+page.svelte` as the test harness (see Phase 5 for the actual playground content wiring, which this phase depends on being at least draft-complete for `MediaLibraryModal`/`ImageEditor` triggers to exist to switch between).

## Related Code Files

- Modify (fixes only, as found): any of the 16 variant files touched in Phases 2-3 (`MediaLibraryModal`, `MediaLibraryGrid`, `ImageEditor`, `RemoteUrlLoader` × 4 variants each)
- Read: `apps/web/src/routes/playground/media-picker/+page.svelte` (existing style-switcher harness)

## Implementation Steps

1. Run the playground locally (only with explicit user go-ahead per this session's dev-server-user-only convention — do not auto-launch `pnpm dev`; ask the user to run it and share the URL/confirm it's up).
2. For each of the 4 new/changed components, switch through all 4 style options and exercise the primary flow (open modal → search/upload/URL tab → select/edit → confirm).
3. Log and fix any prop/behavior drift found; re-verify after each fix.
4. Grep vanilla variant files for stray Tailwind-only utility classes.
5. Confirm no console errors/warnings across all 16 combinations.

## Success Criteria

- [x] All 4 style variants of `MediaLibraryModal`, `MediaLibraryGrid`, `ImageEditor`, `RemoteUrlLoader` behave identically (same props, same callbacks) — only visuals differ. Verified statically (no drift) and live in-browser across all 4 variants (Biblioteca → Subir archivo → Editar imagen → Sobreescribir/Guardar, `picker.state` persisted through every style switch).
- [x] Switching `styleVariant` mid-session doesn't throw, leak object URLs, or lose `picker.state` — verified live: uploaded an item in Shadcn, switched to Tailwind/Vanilla/Headless, the same library item and `picker.state` were present in all 4, no console errors.
- [x] No stray Tailwind utility classes in the vanilla variant files. Verified via grep — none found.
- [x] No new console errors/warnings introduced by this plan's components across the full variant matrix. Verified live — 0 console errors/exceptions across the full manual pass (upload → edit → save → reopen → switch variant ×4).

**Verificación manual en navegador completada (2026-08-25, con autorización explícita del usuario para lanzar `pnpm --filter web dev`).** La auditoría estática previa (0 hallazgos) no alcanzó a cubrir bugs de runtime — el pase en vivo encontró y corrigió 3 problemas reales:

1. **Overlap de tabs en Shadcn (Critical, UX):** `bits-ui`'s `Tabs.Content` marca los paneles inactivos con el atributo `hidden`, pero como esos paneles también llevan la clase Tailwind `flex` (`display:flex`), la cascada CSS resuelve a favor del utility class de autor sobre el `[hidden]` del user-agent stylesheet — el panel "inactivo" seguía renderizado, superpuesto con el activo. Fix: `class="hidden ... data-[state=active]:flex"` en vez de `class="flex ..."` en ambos `Tabs.Content` (`library`/`upload`) de `ui/svelte/shadcn/MediaLibraryModal.svelte`.
2. **Imagen sin ajustar al contenedor en `ImageEditor` (High, funcional):** el `<img>` de preview no tenía `width:100%` en ninguna de las 4 variantes, así que con imágenes más chicas que la columna del grid, el contenedor de crop colapsaba a la altura natural de la imagen (una franja fina) y el overlay de recorte (posicionado en % relativo al contenedor) quedaba desalineado con la imagen real — esto afecta la matemática de `resizeCropRect` para cualquier imagen más chica que el ancho de columna, no solo un caso cosmético. Fix: `width:100%;height:auto` (o `class="w-full h-auto"` en tailwind/shadcn) en las 4 variantes de `ImageEditor.svelte`.
3. **`libraryLoading` atascado en `true` para siempre (Critical, funcional — bug de Fase 1 no detectado hasta esta prueba en vivo):** `listPage()`/`listLibrary()` y `listFolders()` compartían el mismo contador `libraryGeneration` en `runLibrary()`. Al abrir el modal, ambas se disparan concurrentemente (`$effect` de `MediaLibraryModal`); `listFolders()` incrementaba el contador compartido antes de que la respuesta de `listPage()` resolviera, haciendo que el guard `ifCurrent` descartara el commit de `listPage()` por "obsoleto" — `libraryLoading` nunca volvía a `false`, dejando el botón "Sincronizar" deshabilitado permanentemente y la grilla vacía. Fix: contador `foldersGeneration` separado + `runGuarded()` genérico parametrizado, en `core/media-picker.ts`. `reset()` ahora bombea ambos contadores. Sin cambios de contrato público (mismos métodos/firmas).

Verificado con el flujo completo en las 4 variantes: abrir biblioteca → subir archivo → editar (crop/zoom/metadatos) → guardar como nuevo → reabrir biblioteca (item visible, "Sincronizar" funcional) → seleccionar item existente → "Sobreescribir" habilitado (con `sourceKey`) → cambiar `styleVariant` sin perder estado. 164/164 tests y `svelte-check` (970 archivos, 0 errores) en verde tras los 3 fixes.

**4º hallazgo (post-cierre, 2026-08-26) — fuera del alcance literal de esta fase pero es la causa raíz de por qué el usuario percibía "todas las variantes casi iguales, shadcn/tailwind deberían verse mejor":** `apps/web/src/app.css` (marca ModularCore) y `packages/media-picker/ui/shadcn-theme.css` (que cada componente `shadcn/*` importa directamente, por diseño — ver comentario del propio archivo, "self-contained for standalone consumers") declaran el mismo selector `@layer base { :root { --primary: ...; ... } }`. Como el CSS del componente shadcn recién se inyecta cuando ese componente monta (después de que `app.css` ya cargó vía el layout raíz), gana el empate de cascada dentro de la misma capa — silenciosamente pisaba el índigo de marca (`238.7 83.5% 66.7%`) con el zinc-950 genérico de shadcn CLI (`240 5.9% 10%`) para **toda la página, el resto de la sesión**, una vez que la variante shadcn se monta una sola vez (que es la selección por defecto del playground, o sea siempre). Fix: `@layer base, brand;` declarado explícitamente al inicio de `app.css`, con los tokens de marca movidos a `@layer brand` — las capas nombradas fijan su prioridad relativa por la primera mención en todo el documento, sin importar el orden real de carga/montaje de componentes, así que `brand` gana determinísticamente sin importar cuándo se monte el componente shadcn. Verificado en vivo: `--primary` computado pasó de `240 5.9% 10%` a `238.7 83.5% 66.7%`; botones/tabs/paginación en shadcn ahora se ven en índigo de marca en vez de negro. Catálogo/docs/ai-chat (páginas que nunca cargan `shadcn-theme.css`) confirmadas pixel-idénticas tras el cambio. 164/164 tests + `svelte-check` (970 archivos, 0 errores) siguen en verde.

## Risk Assessment

- **Risk:** This phase depends on manual browser verification, which per this session's rules requires the user to run the dev server — it cannot be a fully autonomous phase. **Mitigation:** flag this dependency explicitly in the cook handoff; batch all fixes from one review session rather than repeatedly asking the user to restart the server.
