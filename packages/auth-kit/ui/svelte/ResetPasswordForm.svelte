<script lang="ts">
  import { buildResetPasswordSchema, extractFieldError } from '../../core/validation.js';

  import type { AuthKitRune } from '../../adapters/svelte/create-auth-kit.svelte.js';
  import type { PasswordPolicy } from '../../core/validation.js';

  let { authKit, token, passwordPolicy }: { authKit: AuthKitRune; token: string; passwordPolicy?: PasswordPolicy } = $props();

  let newPassword = $state('');
  let confirmPassword = $state('');
  let showPassword = $state(false);
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
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({ newPassword, confirmPassword });
    const message = extractFieldError(result, key);
    if (message) {
      fieldErrors = { ...fieldErrors, [key]: message };
    } else {
      clearError(key);
    }
  }

  const flow = $derived(authKit.state.resetPassword);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit.resetPassword({ token, newPassword }).catch(() => {});
  }
</script>

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<form onsubmit={handleSubmit} novalidate>
  <div>
    <label for="auth-kit-reset-new">Contraseña nueva</label>
    <input id="auth-kit-reset-new" type={showPassword ? 'text' : 'password'} bind:value={newPassword} oninput={() => clearError('newPassword')} onblur={() => validateField('newPassword')} autocomplete="new-password" />
    <button type="button" onclick={() => (showPassword = !showPassword)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
    {#if fieldErrors.newPassword}<p role="alert">{fieldErrors.newPassword}</p>{/if}
  </div>
  <div>
    <label for="auth-kit-reset-confirm">Confirmar contraseña nueva</label>
    <input id="auth-kit-reset-confirm" type={showPassword ? 'text' : 'password'} bind:value={confirmPassword} oninput={() => clearError('confirmPassword')} onblur={() => validateField('confirmPassword')} autocomplete="new-password" />
    {#if fieldErrors.confirmPassword}<p role="alert">{fieldErrors.confirmPassword}</p>{/if}
  </div>
  <button type="submit" disabled={flow.status === 'submitting'}>
    {flow.status === 'submitting' ? 'Restableciendo…' : 'Restablecer contraseña'}
  </button>
  {#if flow.status === 'error' && flow.error}<p role="alert">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p>Contraseña restablecida.</p>{/if}
</form>
