<script lang="ts">
  import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
  import TurnstileWidget from '../TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../../core/field-config.js';

  let {
    authKit,
    turnstile,
    onNavigateToLogin,
  }: { authKit: AuthKitRune; turnstile?: TurnstileFieldConfig; onNavigateToLogin?: () => void } = $props();

  const inputClass =
    'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
  const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
  const errorClass = 'text-sm text-red-600 dark:text-red-400';

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

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-3">
  <label class={labelClass} for="auth-kit-forgot-email">
    Email
    <input id="auth-kit-forgot-email" type="email" bind:value={email} oninput={() => clearError('email')} onblur={() => validateField('email')} autocomplete="email" class={inputClass} />
  </label>
  {#if fieldErrors.email}<p class={errorClass}>{fieldErrors.email}</p>{/if}
  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}
  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
  >
    {flow.status === 'submitting' ? 'Sending…' : 'Send reset link'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600 dark:text-green-400">Check your email for a reset link.</p>{/if}

  {#if onNavigateToLogin}
    <p class="text-center text-sm text-zinc-600 dark:text-zinc-400">
      Remembered your password? <button type="button" onclick={onNavigateToLogin} class="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300">Sign in</button>
    </p>
  {/if}
</form>
