# @modularcore/auth-kit

All-in-one auth component — login, register, change password, forgot/reset password, and email
verification + resend — with an opt-in Cloudflare Turnstile widget and declarative optional fields
(first/last name, phone, legal consent checkbox, profile type selector). React, Svelte, Vue,
Angular standalone and framework-less (vanilla) adapters, each with four UI presentations
(headless, Tailwind, Shadcn, plain CSS).

**No auth backend, credentials, or auth library ships with this component — and none is
required.** `AuthKitHooks` (see `core/types.ts`) is the only seam to your authentication logic:
you implement `onLogin`, `onRegister`, and the other flow hooks against *whatever* you already
use — a custom REST API, Better Auth, Auth.js/NextAuth, Supabase Auth, Clerk, Firebase Auth,
Laravel Sanctum/Fortify, Django, or anything else. The component never inspects credentials or
session shapes; it only calls the hook you gave it and reports its result through per-flow state.

## What's in this package

- `core/auth-kit.ts` — `AuthKit`, the headless orchestrator: one instance per hook set, owning a
  per-flow state machine (`idle` → `submitting` → `success`/`error`) for each of the seven flows.
  Calling a flow whose hook wasn't configured rejects with a clear error instead of doing nothing.
- `core/types.ts` — the `AuthKitHooks` contract and every payload type (`LoginPayload`,
  `RegisterPayload`, …). Only `onLogin` and `onRegister` are required.
- `core/field-config.ts` — declarative, opt-in config for `firstName`, `lastName`, `phone`,
  `legalConsent` (checkbox + links), `profileType` (select, with your own options/labels), and
  `turnstile`. Nothing is enabled unless you turn it on — the default is a plain email+password
  form.
- `core/validation.ts` — Zod v4 schema builders (`buildLoginSchema`, `buildRegisterSchema`, …) and
  a configurable password policy. Pass your own schema instead if you need different rules.
- `core/turnstile.ts` — `TurnstileController` + `mountTurnstileWidget`, a headless Cloudflare
  Turnstile binding. No-ops (treats the check as passed) when no site key is configured, so local
  dev works without a Cloudflare account.
- `adapters/react`, `adapters/svelte` — thin bindings over `AuthKit` (the Svelte adapter uses
  Svelte 5 runes).
- `adapters/vue`, `adapters/angular` — per-component bindings over the same core. Vue uses a
  `shallowRef`; Angular uses a `signal` plus `DestroyRef` (not a root service — one `AuthKit` per
  form/page that needs it, same pattern as `MediaPickerService`).
- `adapters/vanilla` — binding for pages with no framework: exposes `subscribe`/`destroy` instead
  of relying on a reactive system or someone else's lifecycle.
- `ui/<framework>/*` — the six forms (`LoginForm`, `RegisterForm`, `ChangePasswordForm`,
  `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailForm`) plus `TurnstileWidget`, each in
  four presentations. See [UI style variants](#ui-style-variants) below.

## Wiring it to your own backend

Every flow is just a function you provide. A minimal setup with only email + password (the
default — no field config needed):

```ts
import { useAuthKit } from '@modularcore/auth-kit/react';

const authKit = useAuthKit({
  onLogin: async ({ identifier, password }) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json(); // becomes the resolved session/user your app uses
  },
  onRegister: async (payload) => {
    const res = await fetch('/api/register', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Could not create account');
    return res.json();
  },
});
```

`onChangePassword`, `onForgotPassword`, `onResetPassword`, `onVerifyEmail`, and
`onResendVerification` are optional — only implement the flows you actually render forms for.
Calling `<ChangePasswordForm>` without an `onChangePassword` hook rejects with a descriptive error
rather than failing silently, so a missing wire-up is obvious in development.

### Wiring to Better Auth

No adapter is required — Better Auth's client already exposes the shapes these hooks need:

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
  onForgotPassword: async ({ email }) => {
    const { error } = await client.forgetPassword({ email, redirectTo: '/reset-password' });
    if (error) throw new Error(error.message);
  },
  onResetPassword: async ({ token, newPassword }) => {
    const { error } = await client.resetPassword({ newPassword, token });
    if (error) throw new Error(error.message);
  },
});
```

### Wiring to Auth.js / NextAuth, Supabase, Clerk, Firebase, or anything else

The pattern is identical: call that library's/backend's own sign-in, sign-up, and password
methods inside the matching hook, and throw when it reports failure. `AuthKit` doesn't care what
library produced the result — it just needs a promise that resolves on success and rejects on
failure.

## Declarative optional fields

Nothing beyond email + password is rendered until you turn it on:

```ts
import { RegisterForm } from '@modularcore/auth-kit/ui/react/RegisterForm';

<RegisterForm
  authKit={authKit}
  fieldConfig={{
    phone: { enabled: true },
    profileType: {
      enabled: true,
      label: 'Account type',
      options: [
        { value: 'user', label: 'User' },
        { value: 'collaborator', label: 'Collaborator' },
      ],
    },
    legalConsent: {
      enabled: true,
      text: 'I accept the',
      links: [
        { label: 'Terms', href: '/legal/terms' },
        { label: 'Privacy Policy', href: '/legal/privacy' },
      ],
    },
    turnstile: { enabled: true, siteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY },
  }}
/>;
```

`profileType` is a plain configurable form field — it carries no role/permission logic. What your
backend does with that value (grant a role, route to an approval queue, tag the account) is up to
your `onRegister` hook.

## Cloudflare Turnstile

`TurnstileWidget` (and any form's `turnstile`/`fieldConfig.turnstile` prop) is a client-side check
only. Verify the token server-side, in the same hook that receives it:

```ts
onLogin: async ({ identifier, password, turnstileToken }) => {
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: turnstileToken ?? '' }),
  });
  if (!(await verify.json()).success) throw new Error('Bot check failed');
  // ...proceed with the real login
};
```

When no `siteKey` is configured, the widget renders nothing and reports the check as already
passed (`turnstileToken: ''`) — the same no-op-in-dev behavior a hand-rolled Turnstile integration
would have, so local development never needs a Cloudflare account.

## Usage without a framework (Astro, Blade, HTMX…)

Every other adapter translates the core's state into that framework's reactive system and rides
its lifecycle to unsubscribe. A framework-less page has neither, so `createAuthKitStore` exposes
the subscription as-is and leaves cleanup to you:

```ts
import { createAuthKitStore } from '@modularcore/auth-kit/vanilla';
import { mountLoginForm } from '@modularcore/auth-kit/ui/vanilla/LoginForm';

const authKit = createAuthKitStore({ onLogin, onRegister });
const unmount = mountLoginForm(document.querySelector('#login')!, { authKit });

// on island/page/widget teardown:
unmount();
authKit.destroy();
```

## UI style variants

Each of the six forms plus `TurnstileWidget` ships in four presentations, all sharing the same
props/options — only markup and CSS differ:

- `ui/<framework>/*` — headless UI, no CSS classes, fully consumer-styleable.
- `ui/<framework>/tailwind/` — Tailwind utility classes only.
- `ui/<framework>/shadcn/` — Shadcn-like look via `ui/shadcn-theme.css`'s shared design tokens.
  React's variant additionally uses `@radix-ui/react-checkbox`, `@radix-ui/react-label`, and
  `@radix-ui/react-select` as optional peer dependencies; Svelte, Vue, Angular, and vanilla use
  plain accessible markup styled with the same tokens (no mature Radix port exists for those
  frameworks in this repo yet).
- `ui/<framework>/vanilla/` — plain CSS (`ui/vanilla-styles.css`, `auth-kit-*` class prefix), no
  framework-UI-library dependency, works with or without a bundler.

Try this component live in the [Playground](https://modularcorehub.com/playground/auth-kit).
