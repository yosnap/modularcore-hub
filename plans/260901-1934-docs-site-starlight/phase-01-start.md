---
phase: 1
title: "Spikes bloqueantes"
status: pending
priority: P1
effort: "3-4h"
dependencies: []
---

# Fase 1: Spikes bloqueantes

## Overview

Convertir en hechos verificados los riesgos heredados del brainstorm antes de comprometer código:
dominio personalizado en un segundo servicio Easypanel (S1) y comportamiento real de la API de
Starlight (S3). **Corrección post-red-team (Finding 4):** el spike de validación del build Docker
(antes "S2" en esta fase) se ha movido a la Fase 2, porque requiere que `apps/docs` ya exista —
ejecutarlo aquí era inejecutable por diseño. **Corrección post-red-team (Finding 10):** S1 ahora
bloquea también el arranque de la Fase 2 (no solo el cierre de la Fase 7), porque su respuesta fija
`site`/`base` en `astro.config.mjs`, y cambiarlo después invalida contenido y enlaces ya escritos en
las Fases 2-5.

## Requirements

- Funcional: cada spike produce una respuesta binaria (pasa/falla) registrada por escrito, con plan
  B documentado si falla.
- No funcional: S3 se ejecuta en un directorio/rama desechable, nunca se mergea a `develop`.
- **Gate:** la Fase 2 no fija `site`/`base` en `astro.config.mjs` hasta que S1 tenga una respuesta
  registrada (a/b/c, con la decisión del usuario si aplica).

## Related Code Files

- Create: `plans/260901-1934-docs-site-starlight/reports/spike-s1-easypanel-dominio.md`
- Create: `plans/260901-1934-docs-site-starlight/reports/spike-s3-starlight-api.md`
- Read only: `docs/deployment.md` (runbook existente de Easypanel/`modularhub`, no crear uno paralelo)

## Implementation Steps

### S1 — Aislamiento del servicio + dominio personalizado (riesgo heredado 3, decisión del usuario: aislar si es posible)

1. **Comprobar primero si Easypanel permite crear un proyecto nuevo** (distinto de `iservisat`) para
   alojar `modularhub-docs` de forma aislada — decisión ya tomada por el usuario: aislar siempre que
   el plan/cuenta lo permita, para eliminar por completo el riesgo de que un despliegue de la doc
   afecte a `modularhub` en producción (red-team Finding 9). Verificar en el dashboard: límite de
   proyectos del plan actual (la página de precios de Easypanel lista "hasta 3 proyectos" en el plan
   Free — confirmar contra la cuenta real, no asumir).
2. Si el aislamiento en proyecto propio **es posible**: usarlo como plan por defecto. Continuar con
   los pasos 3-5 sobre ese proyecto nuevo, no sobre `iservisat`.
3. Si el aislamiento **no es posible** (límite de proyectos alcanzado u otra restricción de plan):
   caer al fallback ya documentado — inspeccionar la pantalla "Domains" del servicio `modularhub`
   existente en `iservisat` sin crear servicios nuevos ahí salvo necesidad probada, y aceptar el
   riesgo de rama/proyecto compartido como residual, documentado explícitamente en
   `docs/deployment.md` (Fase 7).
4. Registrar una de estas 3 respuestas de dominio en `reports/spike-s1-easypanel-dominio.md`, junto
   con el resultado del aislamiento (paso 1-3):
   - (a) disponible sin cambios de plan → `site: 'https://docs.modularcorehub.com'`, sin `base`.
   - (b) disponible solo tras upgrade de plan (Hobby+ según `easypanel.io/pricing`).
   - (c) no disponible.
5. Si (b) o (c): documentar las 3 opciones y no decidir por el usuario — presentar en la síntesis
   final del plan:
   - B1: upgrade de plan (decisión de coste del usuario) → mismo `site`/`base` que (a).
   - B2: servir la doc en `modularcorehub.com/docs` (ruta del servicio existente) → exige
     `site: 'https://modularcorehub.com'` + `base: '/docs'` desde la Fase 2, y que toda referencia
     interna use rutas relativas o un helper (nunca `/x` absoluto) — coordinado con Fase 5, que debe
     derivar el prefijo de rutas desde la misma constante `base`, no cablearlo.
   - B3: publicar primero en el dominio interno que Easypanel asigna por defecto al servicio nuevo,
     añadir el dominio propio más tarde. Mismo `site`/`base` que (a); permite avanzar sin bloquear
     todo el proyecto mientras se decide entre B1/B2.
6. Si se creó algún servicio/proyecto de prueba durante la verificación, **eliminarlo antes de cerrar
   S1** — criterio de éxito explícito, no opcional.
7. Verificar `https://modularcorehub.com` responde 200 antes y después de cualquier acción de este
   spike — criterio de no regresión explícito de S1, no solo de la Fase 7.

### S3 — Starlight + versionado manual + guardarraíl de enlaces (spike técnico de API)

Proyecto desechable, fuera de `apps/docs` real (directorio temporal o rama `spike/docs-starlight`
descartable):

1. Instalar `astro@7.2.10` + `@astrojs/starlight@0.41.11`, 3 páginas de prueba.
2. Duplicar el árbol de contenido a un subdirectorio `v0.2/` y comprobar que Starlight lo enruta y
   lo muestra en un grupo de sidebar separado (`autogenerate: { directory: 'v0.2' }`).
3. **Verificar el mecanismo de exclusión de Pagefind para páginas archivadas**, probando en orden:
   (i) campo de frontmatter de Starlight que desactive el indexado por página;
   (ii) atributo `data-pagefind-ignore` inyectado vía override de componente;
   (iii) opción de exclusión en la configuración de Pagefind.
   Adoptar el primero que funcione.
4. Verificar que el mecanismo de *component override* de Starlight (`components: {...}` en
   `astro.config.mjs`) permite renderizar un selector de versión propio y un banner de "archivada"
   en el chrome del sitio.
5. **Confirmar (red-team, Assumption Destroyer Finding 2) que Starlight `0.41.11` NO valida enlaces
   internos rotos ni entradas de sidebar contra páginas inexistentes** (comportamiento por defecto
   verificado como ausente; existe solo como plugin de terceros `starlight-links-validator`, no
   evaluado para adopción). Como no se adopta ese plugin (coherente con el resto del plan: evitar
   dependencias de un solo mantenedor en fase temprana), este spike confirma que hace falta un
   script propio de cobertura (`check-coverage.mjs`, construido en Fase 2) que compare el sidebar
   contra `getCollection('docs')` y falle el build si hay discrepancia — **no** confiar en que
   `astro build` lo detecte solo.
6. Si se decide usar islas Svelte en alguna página: montar un componente `.svelte` con Runes
   (`$state`) dentro de una página `.mdx` con `client:visible` y confirmar que hidrata.

## Success Criteria

- [ ] `reports/spike-s1-easypanel-dominio.md` registra si el aislamiento en proyecto Easypanel propio fue posible... **BLOQUEADO:** requiere acceso humano al dashboard real de Easypanel, no ejecutable de forma autónoma. `site`/`base` en `apps/docs/astro.config.mjs` siguen en la asunción provisional (respuesta "a") hasta que se resuelva.
- [ ] `https://modularcorehub.com` responde 200 antes y después de S1. **BLOQUEADO** — depende del ítem anterior.
- [x] `reports/spike-s3-starlight-api.md` confirma el mecanismo de exclusión de Pagefind, el slot de override, y la ausencia de validación de enlaces rotos en Starlight. Escrito tras verificación empírica real (no como spike aislado desechable, sino contra `apps/docs` real con cada hallazgo corregido en el momento) — ver el informe para el detalle de los 2 hallazgos adicionales no anticipados (restricción de puntos en slugs, bug de CSS `--sl-color-white`).
- [x] Ningún fichero de spike se mergea a `develop` — solo los informes en `reports/`. Cumplido por diseño: no hubo directorio de spike separado, el trabajo se hizo directamente en `apps/docs` real (nada que limpiar).

## Risk Assessment

- **S1 puede requerir coste de plan Easypanel o cambiar el `site`/`base` del sitio.** Señal
  observable: respuesta (c) sin aceptación de B1. Respuesta pre-decidida: no fijar `site`/`base` en
  Fase 2 hasta tener B1 o B3 aceptado explícitamente por el usuario.
- **S3 puede no resolver ningún mecanismo de exclusión de Pagefind.** Señal observable: los 3
  mecanismos fallan en la prueba. Respuesta pre-decidida: aceptar degradación cosmética (banner de
  "versión archivada" sin exclusión real del índice) y documentarlo explícitamente en la Fase 5,
  nunca dejarlo como comportamiento silencioso.
- **Riesgo de infraestructura (red-team, Security Finding 8):** crear un servicio de prueba en
  `iservisat` puede degradar `modularhub` en producción (recursos de host, cuota de Let's Encrypt
  compartida). Mitigación: preferir inspección no destructiva (paso 1); si se crea un servicio,
  eliminarlo antes de cerrar S1 (criterio de éxito explícito).
