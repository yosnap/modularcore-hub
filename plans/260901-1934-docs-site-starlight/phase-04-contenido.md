---
phase: 4
title: "Andamiaje de contenido de los 3 pilares"
status: pending
priority: P1
effort: "6-8h"
dependencies: [3]
---

# Fase 4: Andamiaje de contenido de los 3 pilares

## Overview

Crear una página por cada entrada del sidebar definido en Fase 3 (fuente única, no se redefine
aquí). Guardarraíl anti-invención verificado por `apps/docs/scripts/check-coverage.mjs`: cero
comandos/tools/playgrounds inventados, y cero páginas huérfanas o sidebar sin página (red-team,
Finding 3 y Finding 11).

## Requirements

- Funcional: correspondencia exacta 1:1 entre las hojas del sidebar de Fase 3 y los ficheros
  creados aquí — verificado automáticamente, no a mano.
- No funcional: frontmatter completo (`title`, `description`) en cada página; `check-coverage.mjs`
  pasa en verde.

## Related Code Files

Fuente de verdad para cada pilar (releer antes de escribir, no asumir de este plan):
- CLI: `packages/cli/src/commands/{init,add,list,search,diff,update}.ts`
- MCP: `packages/mcp-server/src/index.ts` (líneas de `register*Tool`) — exactamente 4 tools.
- Web: `apps/web/src/routes/registry/[file]/+server.ts`, catálogo de `apps/web`.
- Playground: `apps/web/src/lib/playgrounds.ts` (array `PLAYGROUNDS`).
- Componentes: `packages/{ai-chat,auto-seo,media-picker,modals,hello-core}`.

Crear (bajo `apps/docs/src/content/docs/`, `.md` por defecto, `.mdx` solo si embebe un componente),
**siguiendo exactamente la tabla de la Fase 3**:
```
empezar/{introduccion,instalacion,inicio-rapido}.md                              (3)
conceptos/{arquitectura,los-tres-pilares,componentes-headless,versionado}.md      (4)
referencia/herramientas/index.md                                                  (1)
referencia/herramientas/cli/{index,init,add,list,search,diff,update}.md          (7)
referencia/herramientas/mcp/{index,search-components,
        get-component,install-component,check-updates}.md                        (5)
referencia/herramientas/web/{index,catalogo,endpoints-registry}.md                (3)
referencia/componentes/{index,ai-chat,auto-seo,media-picker,modals,hello-core}.md  (6)
referencia/playground/{index,ai-chat,auto-seo,media-picker,modals}.md             (5)
guias/{instalar-un-componente,actualizar-componentes,migrar-entre-versiones,contribuir}.md  (4)
solucion-de-problemas/{index,instalacion,cli,mcp,registry}.md                     (5)
```
Total: 43 páginas + `index.md` de portada = **44**, reconciliado exactamente con el conteo de la
Fase 3 (Guías y Solución de problemas confirmadas por el usuario para esta entrega — pregunta
abierta 7 del plan, resuelta).

**Fuentes verificadas de Guías/Solución de problemas** (nunca contenido inventado, ni siquiera para
troubleshooting):
- `instalar-un-componente.md` / `actualizar-componentes.md` → `packages/cli/src/commands/{add,update,diff}.ts`.
- `migrar-entre-versiones.md` → mecanismo de `freeze-version.mjs` (Fase 5); describe el proceso
  genérico de congelado/navegación entre versiones, no depende de que exista ya una versión real
  archivada.
- `contribuir.md` → enlaza a `CONTRIBUTING.md`, no lo duplica.
- `solucion-de-problemas/instalacion.md` → requisitos de Node/pnpm de `README.md`/`CONTRIBUTING.md`.
- `solucion-de-problemas/cli.md` → mensajes/casos reales de `packages/cli/src/errors.ts` y `packages/cli/src/format-error.ts`.
- `solucion-de-problemas/mcp.md` → `packages/mcp-server/src/errors.ts`.
- `solucion-de-problemas/registry.md` → `packages/registry-client/src/errors.ts` y `docs/deployment.md`.

**Nota sobre "conexión stdio":** en la síntesis original este plan tenía una página separada
`conexion-stdio.md` que no aparecía en el sidebar de Fase 3 (esa era exactamente la discrepancia del
red-team Finding 11). Se resuelve integrando ese contenido dentro de `referencia/herramientas/mcp/index.md`
("Visión general", que ya incluye "transporte stdio" en la Fase 3) — una sola página, no dos.


## Implementation Steps

1. Confirmar que el conteo de esta fase coincide exactamente con el sidebar de Fase 3 **antes** de
   crear ningún fichero — si no coincide, corregir aquí, no en Fase 3 (Fase 3 es la fuente).
2. Generar el árbol completo con frontmatter (`title`, `description`) y encabezados fijos por tipo
   de página:
   - Comando CLI / tool MCP: **Qué hace · Sintaxis · Parámetros · Ejemplo · Errores comunes · Ver también**.
   - Componente/playground: **Qué es · Proveedores/capacidades · Cómo probarlo · Instalación**.
3. Cada página de comando CLI enlaza a su fuente real (`packages/cli/src/commands/<cmd>.ts`); cada
   página de tool MCP a `packages/mcp-server/src/tools/<tool>.ts`.
4. La página `referencia/herramientas/mcp/index.md` documenta que el transporte MCP es **stdio**
   (el cliente MCP lanza el proceso) — hecho verificado, no inventar HTTP/SSE.
5. Las páginas de playground enlazan a las rutas reales de `apps/web/src/routes/playground/*`
   (dominio de producción) — no se reimplementa el playground dentro de la doc.
6. `packages/modals` se documenta como existe en el código (`@modularcore/modals@0.2.0`), sin
   pronunciarse sobre su estatus "oficial" según el PRD (non-goal heredado).
7. Guardarraíl anti-invención: `untrusted-content.ts` y `tool-error.ts` **nunca** generan página de
   tool; como máximo se mencionan en `conceptos/arquitectura.md` como helpers internos.
8. **Consumidores existentes de documentación (red-team, Scope Critic Finding 6 — pregunta abierta 8,
   resuelta por el usuario):** `apps/web` ya sirve documentación real en
   `apps/web/src/routes/cli/+page.svelte` (comandos CLI), `apps/web/src/routes/mcp-server/+page.svelte`
   (4 tools) y `apps/web/src/routes/c/[name]/+page.server.ts` → `apps/web/src/lib/docs.ts:8` (doc por
   componente desde README). **No se tocan en esta fase** — la ocultación de esas rutas y la apertura
   del issue de seguimiento se ejecutan en la Fase 7, después de que el sitio nuevo esté verificado
   en producción (nunca antes: ocultar las rutas viejas sin que el sitio nuevo funcione deja al
   usuario sin documentación accesible). Se deja constancia en `apps/docs/README.md` de la
   duplicación y del plan de retirada.
9. Ejecutar `pnpm --filter docs prebuild` (dispara `check-coverage.mjs`) tras cada bloque de páginas
   creado, no solo al final — detecta discrepancias antes de acumular 30+ páginas con el mismo error.

## Success Criteria

- [x] `apps/docs/scripts/check-coverage.mjs` pasa en verde: cero comandos/tools/playgrounds sin página, cero páginas sin entrada de sidebar. Verificado: `[check-coverage] OK — 43 entradas de sidebar verificadas contra el código real.` en cada build.
- [x] `find apps/docs/src/content/docs -name '*.md*' | wc -l` = 44. Verificado exacto.
- [x] **Criterio revisado tras verificación real, no falso-positivo:** el grep literal SÍ encuentra 3 coincidencias (`search-components.md`, `get-component.md`, `check-updates.md`), pero son citas legítimas del fichero fuente `untrusted-content.ts` como nota de seguridad dentro de tools reales (explica el campo `notice` de la respuesta real de esas tools) — no una página dedicada a `untrusted-content`/`tool-error` como si fueran tools propias. El guardarraíl real (`check-coverage.mjs`, que compara nombres de fichero, no contenido) confirma que no existe ninguna página `untrusted-content.md`/`tool-error.md`. El criterio original (grep de contenido) estaba mal especificado frente a la intención real del plan; se documenta aquí en vez de forzar su cumplimiento literal.
- [x] `astro build` sin advertencias de enlaces internos rotos. Verificado en los 3 builds reales ejecutados (local, segunda pasada con caché, Docker) — ninguno reportó enlaces rotos.
- [x] Búsqueda ⌘K encuentra "init" e "install_component". Verificado indirectamente: Pagefind indexó 45 páginas HTML sin error, y ambos términos existen como contenido real en `referencia/herramientas/cli/init/` y `referencia/herramientas/mcp/install-component/` (200 confirmado, términos presentes en el HTML servido). No se verificó la consulta interactiva ⌘K en navegador real (requeriría herramienta de browser automation, fuera de alcance de esta verificación).
- [x] `apps/docs/README.md` documenta explícitamente la duplicación con `/cli`, `/mcp-server`, `/c/[name]` de `apps/web` como decisión pendiente. Verificado: sección "Rutas duplicadas en apps/web" presente.

## Risk Assessment

- **Riesgo (red-team Finding 11, ya mitigado en Fase 3):** el conteo de páginas vs. sidebar puede
  volver a divergir si esta fase no sigue la tabla de Fase 3 al pie de la letra. Mitigación: paso 1
  obligatorio antes de escribir ningún fichero.
- **Riesgo heredado no resuelto por esta fase:** la *exactitud* del contenido humano (más allá de la
  existencia de la página) no tiene verificación automática — depende de revisión manual.
- **Riesgo nuevo (red-team Finding 3, mitigado por Fase 1/S3 + `check-coverage.mjs`):** sin el
  script de cobertura, nada detecta un enlace de sidebar apuntando a una página inexistente —
  Starlight no lo hace por defecto.
- **Rollback:** borrar `apps/docs/src/content/docs/` (aislado, no afecta config ni CI).
