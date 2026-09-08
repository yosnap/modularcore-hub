<script lang="ts">
  import { buildForgotPasswordSchema, extractFieldError } from '../../core/validation.js';
  import TurnstileWidget from './TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../core/field-config.js';

  let { authKit, turnstile }: { authKit: AuthKitRune; turnstile?: TurnstileFieldConfig } = $props();

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<form onsubmit={handleSubmit} novalidate>
  <div>
    <label for="auth-kit-forgot-email">Correo electrónico</label>
    <input id="auth-kit-forgot-email" type="email" bind:value={email} oninput={() => clearError('email')} onblur={() => validateField('email')} autocomplete="email" />
    {#if fieldErrors.email}<p role="alert">{fieldErrors.email}</p>{/if}
  </div>
  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}
  <button type="submit" disabled={flow.status === 'submitting'}>
    {flow.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'}
  </button>
  {#if flow.status === 'error' && flow.error}<p role="alert">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p>Revisa tu correo para ver el enlace de restablecimiento.</p>{/if}
</form>
