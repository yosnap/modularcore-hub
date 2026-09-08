<script lang="ts">
  import '../../shadcn-theme.css';
  import { evaluatePasswordStrength } from '../../../core/password-strength.js';
  import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';
  import { CHECK_PATH, EYE_OFF_PATH, EYE_PATH } from '../icons.js';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { PasswordPolicy } from '../../../core/validation.js';

  let { authKit, token, passwordPolicy }: { authKit: AuthKitRune; token: string; passwordPolicy?: PasswordPolicy } = $props();

  const inputClass =
    'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelClass = 'text-sm font-medium leading-none';
  const errorClass = 'text-sm text-destructive';

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
  const strength = $derived(evaluatePasswordStrength(newPassword, passwordPolicy));

  function strengthBarClass(index: number): string {
    if (index >= strength.score) return 'bg-muted';
    if (strength.score === strength.total) return 'bg-green-500';
    if (strength.score >= strength.total - 1) return 'bg-yellow-500';
    return 'bg-destructive';
  }

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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-reset-new">Contraseña nueva</label>
    <div class="relative">
      <input
        id="auth-kit-reset-new"
        type={showPassword ? 'text' : 'password'}
        bind:value={newPassword}
        oninput={() => clearError('newPassword')}
        onblur={() => validateField('newPassword')}
        autocomplete="new-password"
        class="{inputClass} pr-9"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
    {#if newPassword.length > 0}
      <div class="flex flex-col gap-1.5">
        <div class="flex gap-1">
          {#each Array.from({ length: strength.total }) as _, index (index)}
            <span class="h-1 flex-1 rounded-full {strengthBarClass(index)}"></span>
          {/each}
        </div>
        <ul class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          {#each strength.requirements as requirement (requirement.key)}
            <li class="flex items-center gap-1 {requirement.met ? 'text-green-600' : 'text-muted-foreground'}">
              {#if requirement.met}
                <svg viewBox="0 0 11 11" class="h-3 w-3">{@html CHECK_PATH}</svg>
              {:else}
                <span class="inline-block h-3 w-3" aria-hidden="true">·</span>
              {/if}
              {requirement.label}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if fieldErrors.newPassword}<p class={errorClass}>{fieldErrors.newPassword}</p>{/if}
  </div>

  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-reset-confirm">Confirmar contraseña nueva</label>
    <input id="auth-kit-reset-confirm" type={showPassword ? 'text' : 'password'} bind:value={confirmPassword}
      oninput={() => clearError('confirmPassword')}
      onblur={() => validateField('confirmPassword')}
      autocomplete="new-password"
      class={inputClass}
    />
    {#if fieldErrors.confirmPassword}<p class={errorClass}>{fieldErrors.confirmPassword}</p>{/if}
  </div>

  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
  >
    {flow.status === 'submitting' ? 'Restableciendo…' : 'Restablecer contraseña'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600">Contraseña restablecida.</p>{/if}
</form>
