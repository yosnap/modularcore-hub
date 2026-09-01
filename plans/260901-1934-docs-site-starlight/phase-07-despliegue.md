---
phase: 7
title: "Despliegue (Easypanel + DNS)"
status: pending
priority: P1
effort: "2-4h"
dependencies: [1, 6]
---

# Fase 7: Despliegue (Easypanel + DNS)

## Overview

Publicar `docs.modularcorehub.com` (o la URL/ruta que Fase 1/S1 haya determinado) en producción como
servicio Easypanel nuevo. El `Dockerfile.docs` y `apps/docs/nginx.conf` ya se escribieron y
validaron en la Fase 2 — esta fase **no repite esa validación**, se centra en desplegar la imagen ya
probada, endurecer `nginx.conf` para producción, y resolver el riesgo de acoplamiento de despliegue
con `modularhub`.

**Gate explícito:** esta fase no se declara completa hasta que Fase 1/S1 tenga una respuesta
registrada. Si S1 devuelve (c) y el usuario no acepta B1, la fase se cierra con B3 (ya reflejado en
`site`/`base` desde la Fase 2) y el elemento del dominio queda documentado como abierto.

## Requirements

- Funcional: `https://docs.modularcorehub.com` (o la URL de B2/B3) responde 200 con TLS válido,
  sirve el sitio completo, búsqueda funcional, rutas profundas recargables.
- No funcional: `modularhub`/`modularcorehub.com` sin regresiones; el despliegue de la doc no puede
  disparar un rebuild innecesario de `modularhub`.

## Related Code Files

- Modify: `apps/docs/nginx.conf` (creado en Fase 2 como esqueleto; aquí se completa con cabeceras de seguridad y política de caché correcta para Pagefind)
- Modify: `docs/deployment.md` (runbook **ya existente** de Easypanel — se añade una sección "Servicio `modularhub-docs`", no se crea un fichero `docs/deploy-docs.md` paralelo; red-team, Security Finding 9 y Failure Mode Finding 2 señalaron ambos que un segundo runbook diverge del primero)
- Modify: `apps/web/src/routes/cli/+page.svelte`, `apps/web/src/routes/mcp-server/+page.svelte`, `apps/web/src/routes/c/[name]/+page.server.ts` (ocultar de navegación + aviso de traslado, paso 10 — única modificación de `apps/web` autorizada en este plan)
- Read only: `Dockerfile.docs`, `Dockerfile` (patrón de referencia del servicio existente)

## Implementation Steps

1. **Endurecer `apps/docs/nginx.conf`** (red-team Finding 13, el esqueleto de Fase 2 no tenía esto):
   - Cabeceras de seguridad: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
     `X-Frame-Options: SAMEORIGIN` (o CSP con `frame-ancestors 'self'` si se prefiere más granular),
     `server_tokens off`. Relevante porque `docs.modularcorehub.com` es same-site (mismo dominio
     registrable) que `modularcorehub.com`, y el contenido de la doc puede aceptar contribuciones
     externas vía PR (`CONTRIBUTING.md` documenta el flujo de fork) — cerrar el pivote de cookies
     `Domain=.modularcorehub.com` y el riesgo de clickjacking sobre los comandos de instalación
     copiables.
   - Política de caché diferenciada, no un único bloque `immutable` para todo `/_astro/`:
     `immutable` para assets con hash en el nombre (`/_astro/*`); `no-cache, must-revalidate` para
     `pagefind-entry.json` y `pagefind.js` (no llevan hash pero sus fragmentos referenciados cambian
     en cada build — red-team Finding 13: sin esto, la búsqueda se rompe en el *segundo* despliegue,
     no en el primero, y el fallo no deja rastro de error de servidor).
   - `try_files` con manejo de rutas con barra final; 404 propio de Starlight en vez del de nginx.
2. **Aislamiento del servicio (pregunta abierta 6 del plan, resuelta por el usuario: aislar si es
   posible).** Usar el proyecto Easypanel confirmado en Fase 1/S1: si el aislamiento en un proyecto
   propio fue posible, `modularhub-docs` se crea ahí (elimina por completo el riesgo de rama/proyecto
   compartido con `modularhub`, red-team Finding 9). Si Fase 1/S1 determinó que no era posible
   (límite de plan), aplicar el fallback ya documentado en Fase 1: filtrado por ruta si Easypanel lo
   soporta, o aceptar y documentar el acoplamiento en `docs/deployment.md` como riesgo operativo
   residual — no se decide de nuevo aquí, ya se resolvió en Fase 1.
3. Confirmar la imagen Docker ya validada en Fase 2 (`docker build -f Dockerfile.docs .` + `docker
   run`) sigue construyendo sin cambios — no se repite la validación completa, solo un smoke test.
4. Crear el App service `modularhub-docs` en el proyecto Easypanel confirmado en el paso 2 (aislado
   si fue posible, `iservisat` solo como fallback): fuente = mismo repo, rama según se resuelva la pregunta abierta 4 del plan
   (`docs/deployment.md:12` documenta `chore/easypanel-deployment` "mientras se valida" para
   `modularhub` — confirmar si sigue vigente antes de fijar la de `modularhub-docs`), Build Path =
   raíz (`/`), Dockerfile = `Dockerfile.docs`, puerto interno **80**, sin volúmenes, sin variables de
   entorno secretas.
5. **Desplegar primero contra el dominio interno de Easypanel** (validación funcional sin depender
   de DNS) y confirmarlo antes de tocar ningún registro DNS externo.
6. **DNS después del servicio, no antes** (red-team Finding 6, orden invertido respecto al borrador
   original — crear el DNS antes de que exista un servicio que reclame el hostname deja una ventana
   de apropiación de subdominio o de respuesta por defecto de Traefik): crear el registro A/CNAME de
   `docs.modularcorehub.com` apuntando al servidor de Easypanel; esperar propagación; añadir el
   dominio personalizado en el panel del servicio ya funcionando; verificar la emisión del
   certificado Let's Encrypt vía Traefik.
7. Ejecutar la decisión de Fase 1/S1: si quedó en B3 (dominio interno), documentarlo como elemento
   abierto en `docs/deployment.md`, sin bloquear el resto del plan.
8. Añadir a `docs/deployment.md` (existente) una sección nueva "Servicio `modularhub-docs`" con: la
   decisión de rama compartida (paso 2), el resultado real de Fase 1/S1, y los pasos de rollback.
   No crear `docs/deploy-docs.md` como fichero separado.
9. Actualizar `README.md` (líneas que anuncian "el portal oficial estará en...") para reflejar el
   enlace activo — solo en este último paso, para no anunciar un dominio caído durante el
   despliegue.
10. **Ocultar las rutas duplicadas de `apps/web` (pregunta abierta 8 del plan, resuelta por el
    usuario: ocultar temporalmente, no eliminar, con enlace al sitio nuevo + issue de seguimiento).**
    Solo después de que el paso 6 confirme que `docs.modularcorehub.com` responde 200 con contenido
    completo — nunca antes, para no dejar al usuario sin documentación accesible en la ventana entre
    ambos pasos:
    - `apps/web/src/routes/cli/+page.svelte`, `apps/web/src/routes/mcp-server/+page.svelte` y
      `apps/web/src/routes/c/[name]/+page.server.ts` (que alimenta la doc por componente vía
      `apps/web/src/lib/docs.ts:8`) se ocultan de la navegación (quitar sus enlaces del menú/sitemap
      de `apps/web`), sin borrar el código ni las rutas — siguen accesibles por URL directa, pero
      cada una muestra un aviso corto: "Esta documentación se ha trasladado a
      [docs.modularcorehub.com](https://docs.modularcorehub.com)" con enlace directo a la sección
      equivalente del sitio nuevo.
    - Abrir un issue de GitHub (`gh issue create`) titulado algo como "Eliminar rutas de
      documentación duplicadas en apps/web (`/cli`, `/mcp-server`, `/c/[name]`)", con la lista de
      ficheros afectados y un enlace a este plan, para que su eliminación definitiva se trate como
      trabajo de una iteración futura — no como parte de este plan (evita expandir su alcance).
    - Este paso modifica `apps/web` (excepción explícita al non-goal general de no tocarlo,
      autorizada por decisión directa del usuario en esta pregunta) — limitado estrictamente a
      ocultar navegación y añadir el aviso, sin tocar el registry HTTP ni ninguna otra funcionalidad
      de `apps/web`.

## Success Criteria

- [ ] `curl -I https://docs.modularcorehub.com/` (o la URL de B2/B3) → `200` con certificado TLS válido.
- [ ] Una ruta profunda responde `200` en carga directa, no solo por navegación cliente.
- [ ] Ruta inexistente devuelve el 404 de Starlight, no el de nginx por defecto.
- [ ] `curl -I` sobre `pagefind-entry.json` confirma `no-cache`/`must-revalidate`, no `immutable`.
- [ ] Cabeceras de seguridad presentes (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` o CSP equivalente, `Server` sin versión).
- [ ] Búsqueda ⌘K funciona en producción, incluida una comprobación tras un segundo despliegue simulado (caché no rompe la búsqueda).
- [ ] `https://modularcorehub.com` y el servicio `modularhub` responden igual que antes del despliegue.
- [ ] La decisión sobre acoplamiento de rama (paso 2) está documentada, no implícita.
- [ ] `docs/deployment.md` contiene la sección nueva; no existe `docs/deploy-docs.md` como fichero separado.
- [ ] `README.md` enlaza el dominio como recurso vivo.
- [ ] Las 3 rutas antiguas de `apps/web` (`/cli`, `/mcp-server`, `/c/[name]`) quedan ocultas de la navegación, muestran el aviso de traslado con enlace a `docs.modularcorehub.com`, y siguen respondiendo (no 404) — se ocultan, no se eliminan.
- [ ] Existe un issue de GitHub abierto para la eliminación futura de esas rutas, enlazando a este plan.
- [ ] `modularhub-docs` vive en el proyecto Easypanel aislado confirmado en Fase 1/S1 (o, si no fue posible, el fallback documentado está aplicado y registrado).

## Risk Assessment

- **Riesgo alto, principal de todo el plan:** dominio personalizado en un segundo servicio Easypanel
  no confirmado hasta Fase 1/S1. Respuesta pre-decidida: no cerrar esta fase sin decisión explícita
  del usuario entre B1/B2/B3.
- **Riesgo (red-team Finding 9):** despliegue acoplado a `modularhub` — un commit de solo-docs puede
  redesplegar producción web completa. **Eliminado por diseño** si Fase 1/S1 confirmó el aislamiento
  en un proyecto Easypanel propio (decisión por defecto del usuario). Si el aislamiento no fue
  posible, queda como riesgo operativo aceptado y documentado en `docs/deployment.md`, mitigado solo
  hasta el punto que Easypanel permita filtrado por ruta.
- **Riesgo:** despliegue pull-based sin gate de CI real — el `docker build` (ya validado en Fase 2)
  es lo único que frena un despliegue con docs rotas, dado que CI no construye la imagen.
- **Rollback:** eliminar el servicio `modularhub-docs` en Easypanel y el registro DNS **en ese
  orden** (servicio primero, DNS después — el orden inverso al de creación, para no dejar un
  registro colgante). `modularhub`/`apps/web` no se tocan en ningún paso de esta fase.
