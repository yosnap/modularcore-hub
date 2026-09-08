<script lang="ts">
  import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';
  import { EYE_OFF_PATH, EYE_PATH } from '../icons.js';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { PasswordPolicy } from '../../../core/validation.js';

  let { authKit, token, passwordPolicy }: { authKit: AuthKitRune; token: string; passwordPolicy?: PasswordPolicy } = $props();

  const inputClass =
    'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
  const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
  const errorClass = 'text-sm text-red-600 dark:text-red-400';
  const eyeButtonClass =
    'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

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

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-3">
  <label class={labelClass} for="auth-kit-reset-new">
    New password
    <div class="relative">
      <input id="auth-kit-reset-new" type={showPassword ? 'text' : 'password'} bind:value={newPassword} oninput={() => clearError('newPassword')} onblur={() => validateField('newPassword')} autocomplete="new-password" class="{inputClass} pr-9" />
      <button type="button" onclick={() => (showPassword = !showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} class={eyeButtonClass}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </label>
  {#if fieldErrors.newPassword}<p class={errorClass}>{fieldErrors.newPassword}</p>{/if}

  <label class={labelClass} for="auth-kit-reset-confirm">
    Confirm new password
    <input id="auth-kit-reset-confirm" type={showPassword ? 'text' : 'password'} bind:value={confirmPassword} oninput={() => clearError('confirmPassword')} onblur={() => validateField('confirmPassword')} autocomplete="new-password" class={inputClass} />
  </label>
  {#if fieldErrors.confirmPassword}<p class={errorClass}>{fieldErrors.confirmPassword}</p>{/if}

  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
  >
    {flow.status === 'submitting' ? 'Resetting…' : 'Reset password'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600 dark:text-green-400">Password reset.</p>{/if}
</form>
