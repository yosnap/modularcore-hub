<script lang="ts">
  import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
  import { EYE_OFF_PATH, EYE_PATH } from '../icons.js';
  import TurnstileWidget from '../TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../../core/field-config.js';

  let {
    authKit,
    turnstile,
    onNavigateToRegister,
    onNavigateToForgotPassword,
  }: {
    authKit: AuthKitRune;
    turnstile?: TurnstileFieldConfig;
    onNavigateToRegister?: () => void;
    onNavigateToForgotPassword?: () => void;
  } = $props();

  const inputClass =
    'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
  const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
  const errorClass = 'text-sm text-red-600 dark:text-red-400';
  const linkClass =
    'appearance-none border-0 bg-transparent p-0 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

  let identifier = $state('');
  let password = $state('');
  let showPassword = $state(false);
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
    const result = buildLoginSchema().safeParse({ identifier, password });
    const message = extractFieldError(result, key);
    if (message) {
      fieldErrors = { ...fieldErrors, [key]: message };
    } else {
      clearError(key);
    }
  }

  const flow = $derived(authKit.state.login);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildLoginSchema().safeParse({ identifier, password });
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit.login({ identifier, password, turnstileToken }).catch(() => {});
  }
</script>

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-3">
  <label class={labelClass} for="auth-kit-login-identifier">
    Email or username
    <input id="auth-kit-login-identifier" type="text" bind:value={identifier} oninput={() => clearError('identifier')} onblur={() => validateField('identifier')} autocomplete="username" class={inputClass} />
  </label>
  {#if fieldErrors.identifier}<p class={errorClass}>{fieldErrors.identifier}</p>{/if}

  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <label class="text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-login-password">Password</label>
      {#if onNavigateToForgotPassword}
        <button type="button" onclick={onNavigateToForgotPassword} class={linkClass}>Forgot your password?</button>
      {/if}
    </div>
    <div class="relative">
      <input
        id="auth-kit-login-password"
        type={showPassword ? 'text' : 'password'}
        bind:value={password} oninput={() => clearError('password')} onblur={() => validateField('password')}
        autocomplete="current-password"
        class="{inputClass} pr-9"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        class="absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.password}<p class={errorClass}>{fieldErrors.password}</p>{/if}

  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}

  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
  >
    {flow.status === 'submitting' ? 'Signing in…' : 'Sign in'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600 dark:text-green-400">Signed in.</p>{/if}

  {#if onNavigateToRegister}
    <p class="text-center text-sm text-zinc-600 dark:text-zinc-400">
      Don't have an account yet? <button type="button" onclick={onNavigateToRegister} class="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300">Sign up</button>
    </p>
  {/if}
</form>
