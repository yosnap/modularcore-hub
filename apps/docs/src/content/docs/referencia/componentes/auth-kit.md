---
title: "Auth Kit"
description: "Componente de autenticación todo-en-uno (login, registro, contraseña, verificación) headless, contra el backend o librería de auth que ya usas."
---

`@modularcore/auth-kit` es un componente de autenticación todo-en-uno — login, registro, cambio
de contraseña, recuperar/resetear contraseña y verificación de email con reenvío — con un widget
opcional de Cloudflare Turnstile y campos opcionales declarativos (nombre, apellidos, teléfono,
checkbox de condiciones legales, selector de tipo de perfil). Adaptadores para React, Svelte, Vue,
Angular standalone y páginas sin framework (vanilla).

## Ninguna credencial ni librería de auth vive en este componente — y no la necesita

`AuthKitHooks` (ver `core/types.ts`) es el único punto de contacto con tu lógica de
autenticación. Tú implementas `onLogin`, `onRegister` y el resto de hooks contra lo que ya uses:
una API REST propia, **Better Auth**, **Auth.js/NextAuth**, **Supabase Auth**, **Clerk**,
**Firebase Auth**, **Laravel Sanctum/Fortify**, **Django**, o cualquier otra cosa. El componente
nunca inspecciona credenciales ni la forma de tu sesión: solo llama al hook que le diste y
reporta su resultado a través de un estado por flujo (`idle` → `submitting` → `success`/`error`).

Better Auth no es un requisito ni una dependencia — es solo uno más de los backends contra los
que puedes cablear los hooks, igual que cualquier otro.

## Qué incluye el paquete

- `core/auth-kit.ts` — `AuthKit`, el orquestador headless: una instancia por conjunto de hooks,
  con una máquina de estados por flujo para cada uno de los siete flujos. Llamar a un flujo cuyo
  hook no está configurado rechaza con un error claro en vez de no hacer nada.
- `core/types.ts` — el contrato `AuthKitHooks` y cada tipo de payload. Solo `onLogin` y
  `onRegister` son obligatorios.
- `core/field-config.ts` — configuración declarativa y opt-in para `firstName`, `lastName`,
  `phone`, `legalConsent` (checkbox + enlaces), `profileType` (selector, con tus propias
  opciones/etiquetas) y `turnstile`. Nada se activa si no lo indicas — por defecto es un
  formulario simple de email + contraseña.
- `core/validation.ts` — esquemas Zod v4 (`buildLoginSchema`, `buildRegisterSchema`, …) y una
  política de contraseña configurable. Puedes pasar tu propio esquema si necesitas otras reglas.
- `core/turnstile.ts` — `TurnstileController` + `mountTurnstileWidget`, un binding headless de
  Cloudflare Turnstile. No hace nada (trata el check como superado) si no hay site key
  configurada, así que el desarrollo local funciona sin cuenta de Cloudflare.
- `adapters/react`, `adapters/svelte` — bindings finos sobre `AuthKit` (el adaptador de Svelte usa
  runas de Svelte 5).
- `adapters/vue`, `adapters/angular` — bindings por componente sobre el mismo core. Vue usa un
  `shallowRef`; Angular usa un `signal` más `DestroyRef` (no es un servicio raíz — una instancia
  de `AuthKit` por formulario/página, igual que `MediaPickerService`).
- `adapters/vanilla` — binding sin framework: expone `subscribe`/`destroy` en vez de apoyarse en
  un sistema reactivo o en un ciclo de vida ajeno.
- `ui/<framework>/*` — los seis formularios (`LoginForm`, `RegisterForm`,
  `ChangePasswordForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailForm`) más
  `TurnstileWidget`, cada uno en cuatro presentaciones.

## Cablear tu propio backend

Cada flujo es solo una función que tú implementas. Configuración mínima con solo email +
contraseña (el valor por defecto, sin ninguna configuración de campos):

```ts
import { useAuthKit } from '@modularcore/auth-kit/react';

const authKit = useAuthKit({
  onLogin: async ({ identifier, password }) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    return res.json();
  },
  onRegister: async (payload) => {
    const res = await fetch('/api/register', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('No se pudo crear la cuenta');
    return res.json();
  },
});
```

`onChangePassword`, `onForgotPassword`, `onResetPassword`, `onVerifyEmail` y
`onResendVerification` son opcionales — solo implementas los flujos para los que realmente
renderizas un formulario. Llamar a `<ChangePasswordForm>` sin un hook `onChangePassword` rechaza
con un error descriptivo en vez de fallar en silencio.

### Con Better Auth

No hace falta ningún adaptador — el cliente de Better Auth ya expone lo que estos hooks
necesitan:

```ts
import { createAuthClient } from 'better-auth/client';
import { useAuthKit } from '@modularcore/auth-kit/react';

const client = createAuthClient();

const authKit = useAuthKit({
  onLogin: async ({ identifier, password }) => {
    const { data, error } = await client.signIn.email({ email: identifier, password });
    if (error) throw new Error(error.message);
    return data;
  },
  onRegister: async ({ email, password, firstName, lastName }) => {
    const { data, error } = await client.signUp.email({
      email,
      password,
      name: [firstName, lastName].filter(Boolean).join(' '),
    });
    if (error) throw new Error(error.message);
    return data;
  },
});
```

### Con Auth.js/NextAuth, Supabase, Clerk, Firebase, o cualquier otra

El patrón es idéntico: llamas a los métodos de sign-in/sign-up/contraseña de esa librería o
backend dentro del hook correspondiente, y lanzas un error cuando reporta fallo. `AuthKit` no le
importa qué librería produjo el resultado — solo necesita una promesa que resuelva en éxito y
rechace en fallo.

## Campos opcionales declarativos

Nada más allá de email + contraseña se renderiza hasta que lo activas:

```ts
import { RegisterForm } from '@modularcore/auth-kit/ui/react/RegisterForm';

<RegisterForm
  authKit={authKit}
  fieldConfig={{
    phone: { enabled: true },
    profileType: {
      enabled: true,
      label: 'Tipo de cuenta',
      options: [
        { value: 'user', label: 'Usuario' },
        { value: 'collaborator', label: 'Colaborador' },
      ],
    },
    legalConsent: {
      enabled: true,
      text: 'Acepto los',
      links: [
        { label: 'Términos', href: '/legal/terminos' },
        { label: 'Política de privacidad', href: '/legal/privacidad' },
      ],
    },
    turnstile: { enabled: true, siteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY },
  }}
/>;
```

`profileType` es un campo de formulario configurable sin más — no lleva lógica de
roles/permisos. Qué hace tu backend con ese valor (asignar un rol, encolar una aprobación,
etiquetar la cuenta) es responsabilidad de tu hook `onRegister`.

## Cloudflare Turnstile

`TurnstileWidget` (y la prop `turnstile`/`fieldConfig.turnstile` de cualquier formulario) es solo
una comprobación del lado del cliente. Verifica el token en el servidor, dentro del mismo hook que
lo recibe:

```ts
onLogin: async ({ identifier, password, turnstileToken }) => {
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: turnstileToken ?? '' }),
  });
  if (!(await verify.json()).success) throw new Error('Verificación anti-bot fallida');
  // ...sigue con el login real
};
```

Cuando no hay `siteKey` configurada, el widget no renderiza nada y reporta el check como ya
superado (`turnstileToken: ''`) — el mismo comportamiento no-op en desarrollo que tendría una
integración de Turnstile hecha a mano.

## Uso sin framework (Astro, Blade, HTMX…)

Los demás adaptadores traducen el estado del núcleo al sistema reactivo de su framework y usan su
ciclo de vida para darse de baja. En una página sin framework no existe ninguno de los dos, así
que `createAuthKitStore` expone la suscripción tal cual y deja la limpieza en tus manos:

```ts
import { createAuthKitStore } from '@modularcore/auth-kit/vanilla';
import { mountLoginForm } from '@modularcore/auth-kit/ui/vanilla/LoginForm';

const authKit = createAuthKitStore({ onLogin, onRegister });
const unmount = mountLoginForm(document.querySelector('#login'), { authKit });

// al desmontar la isla, la página o el widget:
unmount();
authKit.destroy();
```

## Variantes de estilo de UI

Cada uno de los seis formularios más `TurnstileWidget` se distribuye en cuatro presentaciones,
todas con las mismas props/opciones — solo cambia el marcado/CSS:

- `ui/<framework>/*` — UI headless, sin clases CSS, totalmente estilizable por quien lo instala.
- `ui/<framework>/tailwind/` — solo clases utilitarias de Tailwind.
- `ui/<framework>/shadcn/` — aspecto Shadcn vía los tokens de diseño compartidos de
  `ui/shadcn-theme.css`. La variante de React usa además `@radix-ui/react-checkbox`,
  `@radix-ui/react-label` y `@radix-ui/react-select` como peer dependencies opcionales; Svelte,
  Vue, Angular y vanilla usan marcado accesible plano con los mismos tokens (no existe un puerto
  de Radix maduro para esos frameworks en este repositorio todavía).
- `ui/<framework>/vanilla/` — CSS plano (`ui/vanilla-styles.css`, prefijo de clase `auth-kit-*`),
  sin dependencia de librería de UI, funciona con o sin bundler.

Prueba este componente en vivo en el [Playground de Auth Kit](/referencia/playground/auth-kit/).
