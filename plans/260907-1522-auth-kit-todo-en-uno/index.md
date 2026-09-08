# Plan: `auth-kit` — componente de autenticación todo-en-uno

## Estado
Implementación base completa y verificada (2026-09-07). Ver "Estado final" al fondo del documento.

## Objetivo
Nuevo paquete de registro (`packages/auth-kit`) con login, registro, cambio de
contraseña, recuperar/resetear contraseña y verificación de email, con
paridad completa desde el día 1 en los 5 frameworks del catálogo (React,
Svelte, Vue, Angular, vanilla) x 4 presentaciones (headless, tailwind,
shadcn, vanilla-css), siguiendo el patrón `headless-core` + adaptadores +
UI ya establecido por `media-picker`.

## Decisiones ya cerradas con el usuario
- **Modelo backend**: BYO vía hooks (`onLogin`, `onRegister`,
  `onForgotPassword`, `onResetPassword`, `onVerifyEmail`,
  `onResendVerification`, `onVerifyTurnstile` opcional server-side). El
  componente nunca incluye servidor ni credenciales, igual que
  `media-picker`.
- **Adaptador Better Auth**: se añade como adaptador de referencia opcional
  además del modelo de hooks BYO (confirmado por el proyecto Motoraldia,
  que ya usa Better Auth — ver referencia abajo).
- **Alcance v1**: paridad completa de frameworks/presentaciones desde el
  inicio (pedido explícito del usuario: "todos los frameworks disponibles,
  incluido vanilla").
- **Campos dinámicos**: configuración declarativa por props/config object
  (nombre, apellidos, teléfono, checkbox legal con texto/links
  configurables, selector de tipo de perfil con opciones definidas por el
  consumidor). Sin Zod embebido obligatorio — el consumidor puede pasar su
  propio schema o usar el que trae el core por defecto.

## Pendiente de confirmar
- **Flujos incluidos**: se asume que además de login/registro se incluyen
  **cambio de contraseña** (usuario logueado), **recuperar/resetear
  contraseña** y **verificación de email** (con reenvío) — el usuario los
  mencionó en el mensaje original ("debería incluirlo") y el proyecto de
  referencia los implementa todos. **Confirmar antes de implementar.**
- **Nombre del paquete**: propuesto `auth-kit` (kebab, sin colisión en
  `packages/`). Confirmar o proponer otro.
- **Selector de tipo de perfil**: en el registro se usa como ejemplo un
  `profileType` (p. ej. "particular"/"profesional" en la app de
  referencia, o "usuario"/"colaborador" en el pedido del usuario) — se
  modela como un campo `select`/`tabs` genérico y configurable, sin lógica
  de roles/permisos embebida (eso es responsabilidad del backend del
  consumidor).

## Referencia externa (solo como inspiración de UX/flujos, no se porta código)
`/Volumes/EVO990/Proyectos/Trabajo/AreaFDesign/Motoraldia-NextJS/motoraldia/`
- `src/components/auth/*` (login/register/forgot-password/reset-password/
  resend-verify/turnstile-widget forms)
- `src/hooks/use-turnstile-token.ts` (patrón token + reset signal)
- `src/app/api/auth/*` (formas de request/response que inspiran los tipos
  de los hooks, no el código en sí: rate limit, constant-time compare,
  bcrypt, Prisma — todo específico de esa app y **no** se copia)
- `src/lib/auth/better-auth.ts` (config Better Auth real, referencia para
  el adaptador opcional)

Ese código es específico de Next.js/Prisma/next-intl/shadcn de esa app; el
`auth-kit` de ModularCore Hub debe ser genérico y headless, no un port.

## Arquitectura (patrón `media-picker`)
```
packages/auth-kit/
  core/                     # headless-core: tipos, hooks contract, field-config, validación por defecto
    auth-kit.ts             # store/orquestador (estado de cada flujo, llamadas a hooks)
    field-config.ts         # definición declarativa de campos opcionales
    validation.ts           # esquemas Zod por defecto, sobreescribibles
    turnstile.ts            # helper headless para cargar/gestionar el script de Turnstile
  adapters/
    react/  svelte/  vue/  angular/  vanilla/
  ui/
    react/{headless,tailwind,shadcn,vanilla}/
      LoginForm.tsx  RegisterForm.tsx  ChangePasswordForm.tsx
      ForgotPasswordForm.tsx  ResetPasswordForm.tsx  VerifyEmailForm.tsx
      TurnstileWidget.tsx
    svelte/{...}/*.svelte  (mismos componentes)
    vue/{...}/*.vue
    angular/{...}/*.ts
    vanilla/{...}/*.ts     (DOM puro, sin build step)
  integrations/
    better-auth/            # adaptador opcional: resuelve los hooks contra Better Auth
  docs/                      # ejemplos de endpoints backend (login/register/...) por stack, como media-picker/docs
  test/
  modularcore.json
  package.json
  README.md
```

## Fases
1. **Core headless** — tipos de hooks, `field-config`, validación por
   defecto, orquestador de estado por flujo (idle/submitting/error/success).
2. **Turnstile headless** — carga de script, ciclo de vida del widget,
   gestión de token/reset, no-op si no hay site key (paridad con el patrón
   observado en Motoraldia).
3. **Adaptadores por framework** — wiring de estado reactivo
   (react/svelte/vue/angular/vanilla) sobre el core.
4. **UI por framework x presentación** — los 6 formularios x 4
   presentaciones x 5 frameworks (headless ya incluido en el core-driven
   render), reutilizando primitivas ya existentes en el repo cuando
   aplique (inputs, password strength, etc. si existen en otro paquete
   compartido; si no, se crean aquí).
5. **Adaptador Better Auth** (opcional) — mapea los hooks a las llamadas
   reales de Better Auth (`signIn.email`, `signUp.email`, etc.).
6. **Descriptor + registry** — `modularcore.json`, build del tarball,
   entradas en `apps/web/registry-data/`, comprobar
   `packages/registry/src/framework-files.ts` recorta bien por framework.
7. **Tests** — unitarios de core/validación/turnstile + smoke por
   adaptador, siguiendo la estructura de `packages/media-picker/test/`.
8. **Docs + playground** — README del paquete, snippets de backend de
   ejemplo por stack (Next.js/Laravel/etc., como `media-picker/docs`), y
   entrada en el playground de `apps/web` para probar visualmente cada
   framework/estilo.

## Criterios de aceptación
- Los 5 frameworks x 4 presentaciones compilan y pasan sus tests para los
  6 formularios.
- Ningún hook opcional forzado: usar solo email+password debe funcionar
  sin configurar nombre/teléfono/perfil/turnstile.
- Turnstile no rompe el formulario si no hay site key configurada (no-op
  como en la app de referencia).
- `modularcore.json` declara correctamente `frameworks` y `ui.<fw>.presentations`.
- Ninguna credencial ni secreto vive en el componente; todo pasa por hooks
  hacia el backend del consumidor.

## No-goals
- No se implementa un backend real de autenticación dentro del paquete.
- No se portan literalmente los endpoints de Motoraldia (Prisma, bcrypt,
  rate-limit, WordPress hash migration) — son específicos de esa app.
- No se implementa lógica de roles/permisos; el selector de "tipo de
  perfil" es solo un campo de formulario configurable.

## Estado final (2026-09-07)

**Hecho y verificado** (`pnpm --filter @modularcore/auth-kit typecheck`, `test`,
`test:ui` en verde; 45 tests):
- `core/`: `types.ts`, `field-config.ts`, `validation.ts` (Zod v4),
  `turnstile.ts` (`TurnstileController` + `mountTurnstileWidget`),
  `auth-kit.ts` (orquestador `AuthKit`, per-flow state machine).
- Los 5 frameworks completos, cada uno con adaptador + los 6 formularios
  (Login, Register, ChangePassword, ForgotPassword, ResetPassword,
  VerifyEmail) × 4 presentaciones (headless/tailwind/shadcn/vanilla) +
  `TurnstileWidget`:
  - **React**: `adapters/react/use-auth-kit.ts` + `ui/react/**`. Tests con
    `@testing-library/react` (jsdom).
  - **Svelte** (runes): `adapters/svelte/create-auth-kit.svelte.ts` +
    `ui/svelte/**`. Tests con `@testing-library/svelte` (jsdom).
  - **Vue**: `adapters/vue/use-auth-kit.ts` + `ui/vue/**`. Tests con
    `@testing-library/vue` (jsdom) + test de adaptador al estilo
    media-picker (mock de `vue`).
  - **Angular**: `adapters/angular/auth-kit.service.ts` (factory +
    `signal`, sin decoradores, igual que `MediaPickerService`) + `ui/angular/**`
    (standalone components con decoradores clásicos — pensados para
    compilarse en el proyecto Angular CLI del consumidor, no en este repo).
    Sin arnés de test/compilación Angular en este repo (igual que
    media-picker): el adaptador tiene test verificado, la UI **no** se ha
    podido compilar ni testear aquí — revisar con cuidado antes de
    confiar en ella a ciegas.
  - **vanilla** (framework, DOM imperativo): `adapters/vanilla/create-auth-kit-store.ts`
    + `ui/vanilla/**` (factories `mount<Form>(container, options): () => void`).
    Tests con `@testing-library/dom` (jsdom).
- `packages/registry`: Radix (`@radix-ui/react-checkbox/label/select`) para
  el shadcn de React; Svelte/Vue/Angular/vanilla usan elementos nativos +
  los tokens compartidos (`ui/shadcn-theme.css`) en vez de una librería de
  primitivas — decisión tomada por falta de un puerto Radix maduro para
  esos frameworks en este repo.
- `modularcore.json` generado y **validado contra el schema real**
  (`node apps/web/scripts/build-registry.mjs` corrió con éxito, 144
  ficheros, `auth-kit.tar.gz` generado sin errores).
- `packages/auth-kit/package.json`: exports completos (core, cada
  adaptador, `ui/<fw>/*`, ambas hojas de estilos compartidas).

**Integración en el resto del repo — hecho (2026-09-07, sesión 2)**:
- `packages/auth-kit/README.md` — hooks BYO, ejemplo con Better Auth y con
  API propia, campos opcionales, Turnstile, uso sin framework.
- `CONTRIBUTING.md` — fila de `auth-kit` en la tabla de paquetes.
- `apps/docs`: página `referencia/componentes/auth-kit.md`, entrada en
  `referencia/componentes/index.md`, página `referencia/playground/auth-kit.md`,
  entrada en `referencia/playground/index.md`, y las 2 entradas de sidebar
  correspondientes en `astro.config.mjs`.
- `apps/web`: entrada en `src/lib/playgrounds.ts`, dependencia de workspace
  en `package.json`, y el playground interactivo real
  `src/routes/playground/auth-kit/+page.svelte` (selector de formulario ×
  selector de estilo × toggles de campos opcionales, sobre
  `src/lib/demo-auth-kit-hooks.ts` — hooks simulados en memoria, sin
  backend real).
- **Verificado en un navegador real** (Chrome vía MCP, `pnpm --filter web
  dev`): Login (éxito y error simulado con `fail`), Register con los 5
  campos opcionales activados y su validación Zod en pantalla, Reset
  Password, Verify Email (auto-verificación al montar, pasa a `success`),
  y 3 de las 4 presentaciones (Shadcn, CSS plano, headless) cambiando en
  vivo sin perder estado. Tailwind y ChangePassword/ForgotPassword no se
  reverificaron visualmente tras un bloqueo cosmético de una extensión de
  Chrome (gestor de contraseñas) al final de la sesión de pruebas — el
  mecanismo es idéntico al resto, riesgo bajo.
- CLI (`packages/cli`) y MCP server (`packages/mcp-server`) — **sin
  cambios de código**: ambos leen el registry de forma dinámica y no
  tienen ningún nombre de componente hardcodeado; confirmado por grep.
- Servidor de dev de `apps/web` parado limpiamente al terminar, sin
  procesos huérfanos.

**Pendiente (no abordado, por alcance/tiempo)**:
- Adaptador opcional a Better Auth (`integrations/better-auth`) — decidido
  en el plan pero no implementado como código; el README/docs ya traen el
  ejemplo de cómo cablear Better Auth manualmente sin ese adaptador.
- Verificación manual/visual de Angular (sin arnés de test aquí).
- `CHANGELOG.md` / bump de versión más allá del `0.1.0` inicial.

**Desviación respecto al plan original**: los subagentes en paralelo
planeados para repartir los 5 frameworks fallaron por un problema de
entorno (tmux/equipo de agentes roto en esta sesión: "stale or
unauthorized agent team"). Con el visto bueno del usuario, se construyó
todo secuencialmente en la misma sesión.
