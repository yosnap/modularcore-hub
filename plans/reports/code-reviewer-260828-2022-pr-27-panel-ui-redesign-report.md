## Code Review Summary

### Scope

- PR: #27 `feat/panel-ui-redesign` (`c6f32b2` → `develop`)
- Files: 18; +1,734 / -247
- Focus: navegación global, tema, catálogo y playgrounds de `apps/web`
- Scout: trazadas las rutas dependientes, el loader del registry, navegación de teclado, SSR/prerender y estilos globales.

### Overall Assessment

La compilación y los checks estáticos pasan, pero la nueva shell introduce dos diálogos/navegaciones modales incompletas para teclado y lectores de pantalla. La PR no debe integrarse hasta corregirlos y cubrirlos con pruebas de interacción.

### Critical Issues

Ninguno.

### Important Issues

- [`apps/web/src/routes/+layout.svelte:142-150, 175-221, 469-509`] El drawer móvil se oculta solo con `transform`, pero sus enlaces y botones continúan en el orden de tabulación cuando está cerrado. Al abrirlo tampoco hay focus trap, Escape no lo cierra y no se devuelve el foco al botón hamburguesa. Un usuario de teclado puede tabular por navegación invisible o quedar en contenido cubierto por el drawer.
  - Fix: tratarlo como diálogo/modal real en móvil: mover foco al abrir, implementar Escape, atrapar Tab, restaurar el foco al trigger y volver el árbol inerte/no tabulable mientras esté cerrado (o desmontarlo).

- [`apps/web/src/lib/components/CommandPalette.svelte:35-40, 78-130`] Se declara `role="dialog" aria-modal="true"`, pero no se atrapa el foco ni se restaura al trigger al cerrarse. `aria-modal` comunica que el resto de la página es inaccesible, pero Tab permite llegar a la shell de fondo. El comentario afirma que Escape cubre a usuarios de teclado, pero no soluciona el aislamiento de foco.
  - Fix: usar un diálogo accesible existente o implementar focus trap con `Tab`/`Shift+Tab`, conservar el elemento activador y devolverle foco en `close`.

- [`apps/web/src/lib/components/CommandPalette.svelte`, `apps/web/src/routes/+layout.svelte`, `apps/web/src/lib/components/ThemeToggle.svelte`] No se añade ningún test para las funcionalidades nuevas de teclado/diálogo, drawer responsive ni persistencia SSR/cliente del tema. Los 401 tests existentes son de paquetes y cuatro helpers web; ninguno monta estos componentes.
  - Fix: añadir tests de componente/integración que cubran `Cmd/Ctrl+K`, flechas/Enter/Escape, focus trap y restauración, drawer móvil (cerrado no tabulable; Escape/click/navegación), y lectura/escritura segura de `mc-theme`.

### Suggestions

- [`apps/web/src/routes/+layout.svelte:151-158`] La marca se reimplementa como SVG inline pese a que el repositorio ya tiene assets de logo y `docs/brand-guide.md` define sus variantes y usos. Mantener dos fuentes visuales deriva el branding y evita reutilizar cambios futuros del asset.
  - Fix: usar el asset de marca apropiado o documentar explícitamente por qué esta variante es necesaria y mantenerla desde una única fuente.

- [`apps/web/src/routes/+layout.svelte:93-124`] La mejora de copiar código inserta SVG por `innerHTML`. Actualmente las dos constantes son estáticas, por lo que no hay XSS; aun así, es un límite de confianza frágil y no presenta estado textual/`aria-live` tras éxito o fallo de clipboard.
  - Fix: crear los nodos SVG mediante DOM/Svelte o mantener las constantes inmutables; anunciar éxito/error de copia y proporcionar fallback cuando Clipboard API no esté disponible.

### Edge Cases Found by Scout

- El root layout se prerenderiza y el nuevo `+layout.server.ts` lee el mismo índice local que `+page.server.ts`; la build aislada confirma que la ruta funciona, aunque se hace la lectura dos veces en la página raíz durante prerender.
- El tema protege `localStorage` con `try/catch`; la clase pre-paint y el estado de hidratación no generan errores en build/SSR. Falta una prueba que cubra almacenamiento denegado y tema guardado.
- Las etiquetas del registry se interpolan mediante plantillas Svelte y el HTML inyectado por la PR es estático: no encontré XSS nuevo, secretos, endpoints ni cambios de autorización.

### Metrics

- Build aislada: correcto (`pnpm build`, 11/11 tareas; warnings preexistentes de media-picker y `@theme`).
- Typecheck aislado tras build de workspaces: 0 errores / 0 warnings.
- Tests: 401/401 en 54 archivos; cobertura no configurada y 0 tests nuevos para UI.
- Lint/format: correctos (`pnpm lint`, `pnpm format:check`).

### Recommended Actions

1. Corregir los dos comportamientos modales de foco y Escape.
2. Añadir pruebas de interacción que reproduzcan los flujos de teclado anteriores.
3. Revalidar build, typecheck, tests y una comprobación responsive manual antes de integrar.

### Unresolved Questions

- Ninguna para bloquear la corrección; la decisión pendiente es si la marca inline debe reemplazarse por el asset existente.
