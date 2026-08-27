---
date: 2026-08-27T19:49:00+02:00
status: resolved-pending-validation
component: laravel-blade-cli-ai-chat
---

# Corrección de bloqueantes de la PR de compatibilidad Laravel

## Contexto

La revisión de la PR `release/v0.9.0 → develop` encontró que la compatibilidad Blade/Laravel se había declarado como terminada sin ser instalable ni ejecutable de verdad. El merge se detuvo antes de convertir una promesa de soporte en deuda para quien intentase usarla.

## Qué ocurrió

Los snippets Blade hacían `import` desde `/resources/js/...` dentro de un `<script type="module">`. Esa ruta es código fuente de Vite, no un asset que Laravel sirva en producción. El CLI tampoco reconocía `composer.json` con `laravel/framework`, por lo que un proyecto Blade no podía llegar de forma fiable a los descriptores. Por último, `ChatCompletionController` aceptaba solo `user`, `assistant` y `system`, aunque el cliente puede enviar `role: tool` y `tool_calls` tras function calling.

## La verdad incómoda

Esto fue un fallo de integración básico: revisamos archivos aislados, no el camino completo de instalación y segunda vuelta de una conversación con herramientas. Es frustrante porque el soporte parecía completo en documentación y registros, pero se rompía justo donde un usuario real empieza. Haberlo fusionado habría dejado a otro desarrollador arreglando una API que nosotros anunciamos como lista.

## Decisiones y detalles técnicos

- Blade ahora deja atributos `data-modularcore-*`; el bundle se importa desde `resources/js/app.js` mediante entradas `src/modularcore/*/entry.ts`, servidas por `@vite`.
- `packages/cli/src/framework-detect.ts` lee `composer.json` y detecta Blade con `laravel/framework`; `init` incorpora `blade` y rutas predeterminadas `resources/views/components` y `resources/js/modularcore`.
- `ChatCompletionController extends Controller`, valida `tool_call_id`, `tool_calls` y `tools`, permite `role: tool`, conserva el límite de 50 mensajes y añade límites explícitos de 32 KiB para contenido y 64 KiB para el payload de herramientas. El error concreto es `422 Tool messages must include tool_call_id.`.
- El controlador de SAS de Azure también extiende `Controller`, haciendo válidos sus mecanismos Laravel de autorización.

Se descartó mantener imports directos desde Blade: no hay una variante segura que convierta rutas fuente en bundles Vite sin una entrada de aplicación. También se descartó aceptar payloads de tools sin validar: trasladaría la superficie de abuso al proveedor upstream.

## Limitación

El repositorio no tiene runtime PHP, por lo que no se pudo ejecutar `php -l` ni una prueba HTTP real contra Laravel/cURL. Las pruebas TypeScript cubren los contratos de snippets, no la ejecución de PHP.

## Siguientes pasos

1. Responsable de la PR: ejecutar `php -l` sobre ambos controllers en una aplicación Laravel con extensión cURL antes de aprobar el merge.
2. Responsable de la PR: levantar Vite y comprobar que `@vite('resources/js/app.js')` monta ambos elementos Blade.
3. Revisor: repetir la revisión de PR tras esas evidencias y autorizar el merge a `develop` solo si el flujo completo funciona.
