---
phase: 7
title: "Playground Style Selector"
status: completed
priority: P1
effort: "4h"
dependencies: [2, 6]
---

# Phase 7: Playground Style Selector

## Overview

Agrega un selector (`<select>` o tabs) al playground (`apps/web/src/routes/playground/media-picker/+page.svelte`) que alterna entre 4 opciones — **Sin estilo** (headless, actual), **Tailwind**, **Shadcn**, **Vanilla** — cambiando en vivo qué import de componente Svelte se usa y qué hoja de estilos está activa.

## Requirements

- Funcional: cambiar el selector re-renderiza los mismos 6 componentes ya montados (`MediaLibraryGrid`, `FolderSelect`, etc.) usando la variante elegida, sin perder el estado del picker (`picker` sigue siendo el mismo `createMediaPicker()` — solo cambia qué componente UI lo consume).
- No funcional: no rompe el resto de la página (textos explicativos, sección de descarga).

## Architecture

```svelte
<script lang="ts">
  import MediaLibraryGridHeadless from '@modularcore/media-picker/ui/svelte/MediaLibraryGrid.svelte';
  import MediaLibraryGridTailwind from '@modularcore/media-picker/ui/svelte/tailwind/MediaLibraryGrid.svelte';
  import MediaLibraryGridShadcn from '@modularcore/media-picker/ui/svelte/shadcn/MediaLibraryGrid.svelte';
  import MediaLibraryGridVanilla from '@modularcore/media-picker/ui/svelte/vanilla/MediaLibraryGrid.svelte';
  // ...mismo patrón para los otros 5 componentes

  // Tailwind ya está disponible globalmente vía app.css (Fase 2) — no se importa acá.
  import '@modularcore/media-picker/ui/shadcn-theme.css';
  import '@modularcore/media-picker/ui/vanilla-styles.css';

  type StyleVariant = 'headless' | 'tailwind' | 'shadcn' | 'vanilla';
  // Default: 'shadcn' (confirmado en plan.md → Validation Log, Sesión 1) — el playground
  // arranca mostrando el tema Shadcn, no el modo sin estilos.
  let styleVariant = $state<StyleVariant>('shadcn');

  const componentsByVariant = {
    headless: { MediaLibraryGrid: MediaLibraryGridHeadless, /* ... */ },
    tailwind: { MediaLibraryGrid: MediaLibraryGridTailwind, /* ... */ },
    shadcn: { MediaLibraryGrid: MediaLibraryGridShadcn, /* ... */ },
    vanilla: { MediaLibraryGrid: MediaLibraryGridVanilla, /* ... */ },
  };
  let Components = $derived(componentsByVariant[styleVariant]);
</script>

<select bind:value={styleVariant}>
  <option value="headless">Sin estilo (headless)</option>
  <option value="tailwind">Tailwind</option>
  <option value="shadcn">Shadcn</option>
  <option value="vanilla">CSS plano</option>
</select>

<Components.MediaLibraryGrid {picker} />
```

Import estático de las 4 variantes de cada componente (no dynamic import) — son 24 imports totales, aceptable para una página de playground; evita la complejidad de code-splitting dinámico para un caso de uso de demo.

## Related Code Files

- Modify: `apps/web/src/routes/playground/media-picker/+page.svelte` (agregar selector + reemplazar imports directos de componentes por el mapa `componentsByVariant`)
- Read: `apps/web/src/app.css` (Fase 2, Tailwind global), `packages/media-picker/ui/shadcn-theme.css`, `packages/media-picker/ui/vanilla-styles.css` (Fases 4-5)

## Implementation Steps

1. Reemplazar los 6 imports directos de componentes headless por imports de las 4 variantes de cada uno (24 imports).
2. Agregar el `<select>` de variante en la parte superior de la página, con `value` inicial `'shadcn'` y el texto explicativo: "Elegí cómo se ve el componente. La descarga (abajo) incluye las 3 variantes con estilo + la headless; usá los imports de la carpeta que prefieras."
3. Construir el mapa `componentsByVariant` y usar `$derived` para resolver qué set de componentes renderizar según `styleVariant`.
4. Reemplazar cada uso de `<MediaLibraryGrid ... />` etc. en el template por `<Components.MediaLibraryGrid ... />` (o desestructurar `$derived` en variables individuales si Svelte no permite acceso dinámico limpio a props tipadas — decidir en implementación).
5. Cargar las 3 hojas de CSS (Tailwind vía Fase 2, `shadcn-theme.css`, `vanilla-styles.css`) siempre activas en esta página (no condicionalmente) — es más simple que cargar/descargar CSS dinámicamente y no hay colisión de nombres entre las 3 (prefijos `mc-` en vanilla, tokens `--` con scope en shadcn, utilities Tailwind con su propio namespace).
6. Verificar visualmente en `pnpm --filter web dev` que cambiar el selector cambia el look de los 6 componentes sin errores de consola ni pérdida de estado del picker.

## Success Criteria

- [x] Selector visible y funcional en `/playground/media-picker`.
- [x] Cambiar de variante preserva el estado (imagen cargada, selección de biblioteca) — el picker no se remonta.
- [x] Las 4 variantes se ven visualmente distintas y sin errores de consola (verificar con `mcp__claude-in-chrome` o Playwright manual antes de dar la fase por terminada, siguiendo la regla de "probar en browser antes de reportar completo" para cambios de frontend).
- [x] Texto explicativo de descarga actualizado, coherente con Assumption #2 del plan.

## Risk Assessment

Medio. Riesgo principal: acceso dinámico a componentes Svelte vía objeto (`Components.MediaLibraryGrid`) puede tener fricción de tipos en Svelte 5 + TS estricto — mitigación: si el patrón de mapa da problemas de tipos, usar un `{#if styleVariant === 'tailwind'}...{:else if ...}` explícito por componente (más verboso pero sin ambigüedad de tipos, sigue siendo ≤400 líneas totales en la página).
