---
title: "Modals"
description: "Sistema headless unificado de overlays: modal, fullscreen, banners, slide-in y toast, con elegibilidad, frecuencia y triggers."
---

`@modularcore/modals` es un sistema de overlays headless y unificado — modal, fullscreen, banner
superior, banner inferior, slide-in y toast — con elegibilidad (targeting, ventana de fechas,
prioridad), limitación de frecuencia en cliente, programación de triggers y un patrón de
proveedor (sin base de datos ni backend incluidos). Incluye adaptadores para React y Svelte 5,
mobile-first y accesible.

## Sin base de datos, sin backend incluido

`ModalsProvider` (ver `core/provider.ts`) es el único punto de contacto entre el core y cualquier
fuente de datos: `getActiveModals(ctx)` devuelve candidatos en bruto, y `trackView`/
`trackInteraction` son hooks que el consumidor conecta a su propio backend si quiere analítica
persistida. Este paquete incluye `core/providers/in-memory.ts` como implementación de referencia y
nada más — consulta `docs/prisma-tracking-endpoint-example.md` (dentro de `packages/modals/`) para
ver cómo conectar un backend real detrás de la misma interfaz.

## Qué incluye el paquete

- `core/types.ts` — el modelo `ModalConfig` agnóstico de framework (6 tipos de overlay, triggers,
  frecuencia, targeting, botones).
- `core/eligibility.ts` — filtro puro: `isActive` → ventana de fechas → targeting → frecuencia.
- `core/frequency.ts` + `core/storage.ts` — limitación de frecuencia en cliente (`always` /
  `once-per-session` / `once-per-day` / `once-ever`) a través de `sessionStorage`/`localStorage`
  inyectables.
- `core/triggers.ts` — programación de triggers (`page-load`/`delay`, `scroll`, `exit-intent`,
  `click`, `manual`) contra un `TriggerEnvironment` inyectable.
- `core/modals.ts` — `OverlayManager`, el orquestador headless: resuelve las configuraciones
  elegibles en un ganador por slot singleton (`modal`/`fullscreen` comparten slot) más una pila de
  `toast` con límite, programa triggers y muestra/descarta notificando a los suscriptores.
- `core/provider.ts`, `core/providers/in-memory.ts` — el punto de contacto de proveedor + su
  implementación de referencia.
- `adapters/react`, `adapters/svelte` — bindings finos sobre `OverlayManager` (el adaptador de
  Svelte usa runas de Svelte 5). Una instancia de manager por hook/runa, con `destroy()`
  conectado al desmontaje para que los listeners de scroll/mouseout/timeout siempre se limpien.
- `ui/a11y/*`, `ui/safe/*` — helpers compartidos y agnósticos de framework de focus-trap/reduced-
  motion y validación de URL/color, consumidos tanto por `ui/react` como por `ui/svelte`.
- `ui/react/*`, `ui/svelte/*` — un conjunto de componentes por tipo de overlay, más
  `ModalsRenderer`, que mapea el estado del manager a ellos.

## Frontera de seguridad: el proveedor es contenido no confiable

Los resultados de `getActiveModals()` son contenido que se renderiza en el DOM. `message`,
`imageUrl` y el `url` de los botones pueden proceder de una base de datos o CMS con menor
confianza que el propio código que llama a este paquete — así que `ui/react`/`ui/svelte` tratan
cada `ModalConfig` como no confiable y aplican esta frontera ellos mismos (no se delega al
consumidor):

- `message` se renderiza como **texto plano** por defecto. Solo cuando `allowHtml: true` pasa por
  `renderMarkdownToHtml` (de `@modularcore/ai-chat/markdown`, solo Markdown — nunca HTML crudo).
- El `url` de los botones y `imageUrl` pasan por un allowlist (`ui/safe/url.ts`): `https:`/
  `http:`/`mailto:`/`tel:` para enlaces, `https:` (o `data:` opcional con límite de tamaño) para
  imágenes. `javascript:` y cualquier otra cosa se descarta, cayendo a un `<button>` plano o sin
  imagen en lugar de la URL suministrada.
- Los enlaces externos siempre llevan `rel="noopener noreferrer"`; las imágenes,
  `referrerpolicy="no-referrer"`.
- `bgColor`/`textColor` se validan contra un patrón hex/`rgb()`/`rgba()` (`ui/safe/style.ts`) antes
  de llegar nunca a un atributo `style`; `maxWidth` es un enum cerrado mapeado a una clase, nunca
  una cadena de estilo libre.

## Uso básico (React)

```tsx
import { useModals } from '@modularcore/modals/react';
import { ModalsRenderer } from '@modularcore/modals/ui/react/ModalsRenderer';
import { createInMemoryProvider } from '@modularcore/modals/providers/in-memory';

const provider = createInMemoryProvider({
  modals: [
    {
      id: 'welcome',
      type: 'top-banner',
      message: '¡Bienvenido! 20% de descuento hoy.',
      trigger: { type: 'delay', value: 2000 },
    },
  ],
});

function App() {
  const { state, dismiss } = useModals(provider, { path: window.location.pathname });
  return <ModalsRenderer state={state} onDismiss={dismiss} />;
}
```

## Uso básico (Svelte 5)

```svelte
<script lang="ts">
  import { createModals } from '@modularcore/modals/svelte';
  import ModalsRenderer from '@modularcore/modals/ui/svelte/ModalsRenderer.svelte';
  import { createInMemoryProvider } from '@modularcore/modals/providers/in-memory';

  const provider = createInMemoryProvider({ modals: [/* ... */] });
  const modals = createModals(provider, { path: '/' }); // debe llamarse durante la inicialización del componente
</script>

<ModalsRenderer state={modals.state} ondismiss={modals.dismiss} />
```

## Accesibilidad y diseño responsive

`modal`/`fullscreen` atrapan el foco (ciclo Tab/Shift+Tab, foco restaurado al cerrar), se cierran
con Escape y exponen `role="dialog" aria-modal="true"`. `top-banner`/`bottom-banner`/`slide-in`/
`toast` usan `aria-live="polite"` (toast: `role="status"`) y nunca roban el foco. Todos los tipos
son mobile-first: ancho completo o casi completo en viewports estrechos, sin scroll horizontal, y
las transiciones se omiten cuando `prefers-reduced-motion` está activo.

Prueba este componente en vivo en el [Playground de Modals](/referencia/playground/modals/).
