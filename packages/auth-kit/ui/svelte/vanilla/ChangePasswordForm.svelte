<script lang="ts">
  import '../../vanilla-styles.css';
  import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';
  import { EYE_OFF_PATH, EYE_PATH } from '../icons.js';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { PasswordPolicy } from '../../../core/validation.js';

  let { authKit, passwordPolicy }: { authKit: AuthKitRune; passwordPolicy?: PasswordPolicy } = $props();

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let showCurrent = $state(false);
  let showNew = $state(false);
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
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({ currentPassword, newPassword, confirmPassword });
    const message = extractFieldError(result, key);
    if (message) {
      fieldErrors = { ...fieldErrors, [key]: message };
    } else {
      clearError(key);
    }
  }

  const flow = $derived(authKit.state.changePassword);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit.changePassword({ currentPassword, newPassword }).catch(() => {});
  }
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<form onsubmit={handleSubmit} novalidate class="auth-kit-form">
  <div class="auth-kit-field">
    <label for="auth-kit-change-current">Contraseña actual</label>
    <div class="auth-kit-field__control">
      <input id="auth-kit-change-current" type={showCurrent ? 'text' : 'password'} bind:value={currentPassword} oninput={() => clearError('currentPassword')} onblur={() => validateField('currentPassword')} autocomplete="current-password" class="auth-kit-input" />
      <button type="button" onclick={() => (showCurrent = !showCurrent)} aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'} class="auth-kit-eye-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {@html showCurrent ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.currentPassword}<p class="auth-kit-error">{fieldErrors.currentPassword}</p>{/if}

  <div class="auth-kit-field">
    <label for="auth-kit-change-new">Contraseña nueva</label>
    <div class="auth-kit-field__control">
      <input id="auth-kit-change-new" type={showNew ? 'text' : 'password'} bind:value={newPassword} oninput={() => clearError('newPassword')} onblur={() => validateField('newPassword')} autocomplete="new-password" class="auth-kit-input" />
      <button type="button" onclick={() => (showNew = !showNew)} aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'} class="auth-kit-eye-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {@html showNew ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.newPassword}<p class="auth-kit-error">{fieldErrors.newPassword}</p>{/if}

  <label class="auth-kit-field" for="auth-kit-change-confirm">
    Confirmar contraseña nueva
    <input id="auth-kit-change-confirm" type={showNew ? 'text' : 'password'} bind:value={confirmPassword} oninput={() => clearError('confirmPassword')} onblur={() => validateField('confirmPassword')} autocomplete="new-password" class="auth-kit-input" />
  </label>
  {#if fieldErrors.confirmPassword}<p class="auth-kit-error">{fieldErrors.confirmPassword}</p>{/if}

  <button type="submit" disabled={flow.status === 'submitting'} class="auth-kit-button auth-kit-button--primary">
    {flow.status === 'submitting' ? 'Actualizando…' : 'Actualizar contraseña'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class="auth-kit-error">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="auth-kit-success">Contraseña actualizada.</p>{/if}
</form>
