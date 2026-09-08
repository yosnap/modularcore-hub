<script lang="ts">
  import '../../vanilla-styles.css';
  import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
  import TurnstileWidget from '../TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../../core/field-config.js';

  let {
    authKit,
    turnstile,
    onNavigateToLogin,
  }: { authKit: AuthKitRune; turnstile?: TurnstileFieldConfig; onNavigateToLogin?: () => void } = $props();

  let email = $state('');
  let turnstileToken: string | null = $state(null);
  let fieldErrors: Record<string, string> = $state({});

  
  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  function clearError(key: string): void {
    if (key in fieldErrors) {
      const { [key]: _removed, ...rest } = fieldErrors;
      fieldErrors = rest;
    }
  }

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  function validateField(key: string): void {
    const result = buildForgotPasswordSchema().safeParse({ email });
    const message = extractFieldError(result, key);
    if (message) {
      fieldErrors = { ...fieldErrors, [key]: message };
    } else {
      clearError(key);
    }
  }

  const flow = $derived(authKit.state.forgotPassword);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildForgotPasswordSchema().safeParse({ email });
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit.forgotPassword({ email, turnstileToken }).catch(() => {});
  }
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<form onsubmit={handleSubmit} novalidate class="auth-kit-form">
  <label class="auth-kit-field" for="auth-kit-forgot-email">
    Correo electrónico
    <input id="auth-kit-forgot-email" type="email" bind:value={email} oninput={() => clearError('email')} onblur={() => validateField('email')} autocomplete="email" class="auth-kit-input" />
  </label>
  {#if fieldErrors.email}<p class="auth-kit-error">{fieldErrors.email}</p>{/if}
  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}
  <button type="submit" disabled={flow.status === 'submitting'} class="auth-kit-button auth-kit-button--primary">
    {flow.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class="auth-kit-error">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="auth-kit-success">Revisa tu correo para ver el enlace de restablecimiento.</p>{/if}

  {#if onNavigateToLogin}
    <p class="auth-kit-status">
      ¿Recordaste tu contraseña? <button type="button" onclick={onNavigateToLogin} class="auth-kit-button auth-kit-button--ghost">Iniciar sesión</button>
    </p>
  {/if}
</form>
