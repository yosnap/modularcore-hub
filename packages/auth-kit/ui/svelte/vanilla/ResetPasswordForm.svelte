<script lang="ts">
  import '../../vanilla-styles.css';
  import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';
  import { EYE_OFF_PATH, EYE_PATH } from '../icons.js';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { PasswordPolicy } from '../../../core/validation.js';

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

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<form onsubmit={handleSubmit} novalidate class="auth-kit-form">
  <div class="auth-kit-field">
    <label for="auth-kit-reset-new">Contraseña nueva</label>
    <div class="auth-kit-field__control">
      <input id="auth-kit-reset-new" type={showPassword ? 'text' : 'password'} bind:value={newPassword} oninput={() => clearError('newPassword')} onblur={() => validateField('newPassword')} autocomplete="new-password" class="auth-kit-input" />
      <button type="button" onclick={() => (showPassword = !showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} class="auth-kit-eye-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.newPassword}<p class="auth-kit-error">{fieldErrors.newPassword}</p>{/if}

  <label class="auth-kit-field" for="auth-kit-reset-confirm">
    Confirmar contraseña nueva
    <input id="auth-kit-reset-confirm" type={showPassword ? 'text' : 'password'} bind:value={confirmPassword} oninput={() => clearError('confirmPassword')} onblur={() => validateField('confirmPassword')} autocomplete="new-password" class="auth-kit-input" />
  </label>
  {#if fieldErrors.confirmPassword}<p class="auth-kit-error">{fieldErrors.confirmPassword}</p>{/if}

  <button type="submit" disabled={flow.status === 'submitting'} class="auth-kit-button auth-kit-button--primary">
    {flow.status === 'submitting' ? 'Restableciendo…' : 'Restablecer contraseña'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class="auth-kit-error">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="auth-kit-success">Contraseña restablecida.</p>{/if}
</form>
