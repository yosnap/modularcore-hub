<script lang="ts">
  import { createAuthKit } from '@modularcore/auth-kit/svelte';
  import ModernSelect from '$lib/components/ModernSelect.svelte';
  import { createDemoAuthKitHooks } from '$lib/demo-auth-kit-hooks';

  import LoginFormHeadless from '@modularcore/auth-kit/ui/svelte/LoginForm.svelte';
  import RegisterFormHeadless from '@modularcore/auth-kit/ui/svelte/RegisterForm.svelte';
  import ChangePasswordFormHeadless from '@modularcore/auth-kit/ui/svelte/ChangePasswordForm.svelte';
  import ForgotPasswordFormHeadless from '@modularcore/auth-kit/ui/svelte/ForgotPasswordForm.svelte';
  import ResetPasswordFormHeadless from '@modularcore/auth-kit/ui/svelte/ResetPasswordForm.svelte';
  import VerifyEmailFormHeadless from '@modularcore/auth-kit/ui/svelte/VerifyEmailForm.svelte';

  import LoginFormTailwind from '@modularcore/auth-kit/ui/svelte/tailwind/LoginForm.svelte';
  import RegisterFormTailwind from '@modularcore/auth-kit/ui/svelte/tailwind/RegisterForm.svelte';
  import ChangePasswordFormTailwind from '@modularcore/auth-kit/ui/svelte/tailwind/ChangePasswordForm.svelte';
  import ForgotPasswordFormTailwind from '@modularcore/auth-kit/ui/svelte/tailwind/ForgotPasswordForm.svelte';
  import ResetPasswordFormTailwind from '@modularcore/auth-kit/ui/svelte/tailwind/ResetPasswordForm.svelte';
  import VerifyEmailFormTailwind from '@modularcore/auth-kit/ui/svelte/tailwind/VerifyEmailForm.svelte';

  import LoginFormShadcn from '@modularcore/auth-kit/ui/svelte/shadcn/LoginForm.svelte';
  import RegisterFormShadcn from '@modularcore/auth-kit/ui/svelte/shadcn/RegisterForm.svelte';
  import ChangePasswordFormShadcn from '@modularcore/auth-kit/ui/svelte/shadcn/ChangePasswordForm.svelte';
  import ForgotPasswordFormShadcn from '@modularcore/auth-kit/ui/svelte/shadcn/ForgotPasswordForm.svelte';
  import ResetPasswordFormShadcn from '@modularcore/auth-kit/ui/svelte/shadcn/ResetPasswordForm.svelte';
  import VerifyEmailFormShadcn from '@modularcore/auth-kit/ui/svelte/shadcn/VerifyEmailForm.svelte';

  import LoginFormVanilla from '@modularcore/auth-kit/ui/svelte/vanilla/LoginForm.svelte';
  import RegisterFormVanilla from '@modularcore/auth-kit/ui/svelte/vanilla/RegisterForm.svelte';
  import ChangePasswordFormVanilla from '@modularcore/auth-kit/ui/svelte/vanilla/ChangePasswordForm.svelte';
  import ForgotPasswordFormVanilla from '@modularcore/auth-kit/ui/svelte/vanilla/ForgotPasswordForm.svelte';
  import ResetPasswordFormVanilla from '@modularcore/auth-kit/ui/svelte/vanilla/ResetPasswordForm.svelte';
  import VerifyEmailFormVanilla from '@modularcore/auth-kit/ui/svelte/vanilla/VerifyEmailForm.svelte';

  // Demo-only: any email/password works after an artificial delay; type "fail" as the
  // password/current-password/email prefix to see each form's error state. No backend behind
  // this — see apps/web/src/lib/demo-auth-kit-hooks.ts.
  const authKit = createAuthKit(createDemoAuthKitHooks());

  const DEMO_RESET_TOKEN = 'demo-reset-token';
  const DEMO_EMAIL = 'demo@example.com';

  type StyleVariant = 'headless' | 'tailwind' | 'shadcn' | 'vanilla';
  let styleVariant = $state<StyleVariant>('shadcn');

  type FormKind = 'login' | 'register' | 'changePassword' | 'forgotPassword' | 'resetPassword' | 'verifyEmail';
  let formKind = $state<FormKind>('login');

  const componentsByForm = {
    login: { headless: LoginFormHeadless, tailwind: LoginFormTailwind, shadcn: LoginFormShadcn, vanilla: LoginFormVanilla },
    register: { headless: RegisterFormHeadless, tailwind: RegisterFormTailwind, shadcn: RegisterFormShadcn, vanilla: RegisterFormVanilla },
    changePassword: {
      headless: ChangePasswordFormHeadless,
      tailwind: ChangePasswordFormTailwind,
      shadcn: ChangePasswordFormShadcn,
      vanilla: ChangePasswordFormVanilla,
    },
    forgotPassword: {
      headless: ForgotPasswordFormHeadless,
      tailwind: ForgotPasswordFormTailwind,
      shadcn: ForgotPasswordFormShadcn,
      vanilla: ForgotPasswordFormVanilla,
    },
    resetPassword: {
      headless: ResetPasswordFormHeadless,
      tailwind: ResetPasswordFormTailwind,
      shadcn: ResetPasswordFormShadcn,
      vanilla: ResetPasswordFormVanilla,
    },
    verifyEmail: {
      headless: VerifyEmailFormHeadless,
      tailwind: VerifyEmailFormTailwind,
      shadcn: VerifyEmailFormShadcn,
      vanilla: VerifyEmailFormVanilla,
    },
  } as const;

  // Switching either selector swaps which component renders — `authKit` itself is untouched, so
  // per-flow state (submitting/error/success) survives the switch.
  const ActiveForm = $derived(componentsByForm[formKind][styleVariant]);

  let enableFirstName = $state(false);
  let enableLastName = $state(false);
  let enablePhone = $state(false);
  let enableProfileType = $state(false);
  let enableLegalConsent = $state(false);

  const fieldConfig = $derived({
    firstName: { enabled: enableFirstName },
    lastName: { enabled: enableLastName },
    phone: { enabled: enablePhone },
    profileType: enableProfileType
      ? {
          enabled: true,
          label: 'Tipo de cuenta',
          options: [
            { value: 'user', label: 'Usuario' },
            { value: 'collaborator', label: 'Colaborador' },
          ],
        }
      : { enabled: false, options: [] },
    legalConsent: enableLegalConsent
      ? { enabled: true, text: 'Acepto los', links: [{ label: 'Términos', href: '#' }] }
      : { enabled: false, text: '' },
  });

  const flowByForm = {
    login: 'login',
    register: 'register',
    changePassword: 'changePassword',
    forgotPassword: 'forgotPassword',
    resetPassword: 'resetPassword',
    verifyEmail: 'verifyEmail',
  } as const;

  const activeFlow = $derived(authKit.state[flowByForm[formKind]]);

  // Cross-navigation footer links (e.g. "Already have an account? Sign in") are optional callback
  // props on the component itself — router-agnostic. Here we just swap `formKind`.
  function goToLogin(): void {
    formKind = 'login';
  }
  function goToRegister(): void {
    formKind = 'register';
  }
  function goToForgotPassword(): void {
    formKind = 'forgotPassword';
  }
</script>

<h1>Playground: Auth Kit</h1>
<p>
  Demo en vivo de <code>@modularcore/auth-kit</code> con <strong>hooks simulados en memoria</strong>
  (<code>createDemoAuthKitHooks</code>): no hay backend real detrás, cualquier email/contraseña
  funciona, y puedes escribir <code>fail</code> como contraseña/email para ver el estado de error de
  cada formulario. En una app real, sustituyes estos hooks por llamadas a tu propio backend o a la
  librería de autenticación que uses (Better Auth, Auth.js, Supabase, Clerk…) — el componente no
  depende de ninguna de ellas.
</p>

<div class="selectors">
  <label>
    Formulario
    <ModernSelect
      bind:value={formKind}
      ariaLabel="Formulario"
      options={[
        { value: 'login', label: 'Login' },
        { value: 'register', label: 'Registro' },
        { value: 'changePassword', label: 'Cambiar contraseña' },
        { value: 'forgotPassword', label: 'Olvidé mi contraseña' },
        { value: 'resetPassword', label: 'Resetear contraseña' },
        { value: 'verifyEmail', label: 'Verificar email' },
      ]}
    />
  </label>
  <label>
    Estilo del componente
    <ModernSelect
      bind:value={styleVariant}
      ariaLabel="Estilo del componente"
      options={[
        { value: 'headless', label: 'Sin estilo (headless)' },
        { value: 'tailwind', label: 'Tailwind' },
        { value: 'shadcn', label: 'Shadcn' },
        { value: 'vanilla', label: 'CSS plano' },
      ]}
    />
  </label>
  <small>
    La descarga del componente (<code>modularcore add auth-kit</code> o el tarball del catálogo)
    incluye las 4 presentaciones — este selector solo cambia el preview en vivo.
  </small>
</div>

{#if formKind === 'register'}
  <div class="field-toggles">
    <span class="field-toggles__title">Campos opcionales (solo Registro)</span>
    <label><input type="checkbox" bind:checked={enableFirstName} /> Nombre</label>
    <label><input type="checkbox" bind:checked={enableLastName} /> Apellidos</label>
    <label><input type="checkbox" bind:checked={enablePhone} /> Teléfono</label>
    <label><input type="checkbox" bind:checked={enableProfileType} /> Tipo de cuenta</label>
    <label><input type="checkbox" bind:checked={enableLegalConsent} /> Condiciones legales</label>
    <small>
      Turnstile no se demuestra aquí en vivo — necesita una site key real de Cloudflare asociada a
      este dominio; consulta la sección Turnstile de la documentación del componente.
    </small>
  </div>
{/if}

<div class="debug-strip">
  <p>Estado del flujo «{formKind}»: <code>{activeFlow.status}</code></p>
  {#if activeFlow.error}
    <p class="error">{activeFlow.error.message}</p>
  {/if}
</div>

<div class="form-wrapper">
  <!--
    `ActiveForm` collapses the 24 possible components into one dynamic reference, so
    svelte-check infers its props as the intersection of every form's props — including
    `token` (only ResetPasswordForm requires it) and `fieldConfig`/`email` (only
    Register/VerifyEmail accept them). Passing all of them unconditionally satisfies that
    intersection; each concrete component simply ignores the props it doesn't declare.
  -->
  <ActiveForm
    {authKit}
    {fieldConfig}
    token={DEMO_RESET_TOKEN}
    email={DEMO_EMAIL}
    onNavigateToLogin={goToLogin}
    onNavigateToRegister={goToRegister}
    onNavigateToForgotPassword={goToForgotPassword}
  />
</div>

<style>
  .error {
    color: var(--mc-danger, #dc2626);
  }
  .selectors {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.9rem 1.1rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-xl);
    background: var(--ui-glass-bg);
    margin-bottom: 1rem;
    font-weight: 600;
  }
  .field-toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.1rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-xl);
    background: var(--ui-glass-bg);
    margin-bottom: 1rem;
    font-size: 0.85rem;
    font-weight: 400;
  }
  .field-toggles__title {
    font-weight: 600;
    width: 100%;
  }
  .debug-strip {
    display: inline-flex;
    flex-direction: column;
    gap: 0.25rem;
    align-self: flex-start;
    max-width: 100%;
    padding: 0.5rem 0.85rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-xl);
    background: var(--ui-glass-bg);
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
  }
  .form-wrapper {
    max-width: 420px;
  }
</style>
