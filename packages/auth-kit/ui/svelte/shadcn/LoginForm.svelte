<script lang="ts">
  import '../../shadcn-theme.css';
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
    'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelClass = 'text-sm font-medium leading-none';
  const errorClass = 'text-sm text-destructive';
  const linkClass = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens (no assumption the consumer has shadcn/ui installed). Same props/behavior as headless. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-login-identifier">Email or username</label>
    <input id="auth-kit-login-identifier" type="text" bind:value={identifier}
      oninput={() => clearError('identifier')}
      onblur={() => validateField('identifier')}
      autocomplete="username"
      class={inputClass}
    />
    {#if fieldErrors.identifier}<p class={errorClass}>{fieldErrors.identifier}</p>{/if}
  </div>

  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label class={labelClass} for="auth-kit-login-password">Password</label>
      {#if onNavigateToForgotPassword}
        <button type="button" onclick={onNavigateToForgotPassword} class={linkClass}>Forgot your password?</button>
      {/if}
    </div>
    <div class="relative">
      <input
        id="auth-kit-login-password"
        type={showPassword ? 'text' : 'password'}
        bind:value={password}
        oninput={() => clearError('password')}
        onblur={() => validateField('password')}
        autocomplete="current-password"
        class="{inputClass} pr-9"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
    {#if fieldErrors.password}<p class={errorClass}>{fieldErrors.password}</p>{/if}
  </div>

  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}

  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
  >
    {flow.status === 'submitting' ? 'Signing in…' : 'Sign in'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600">Signed in.</p>{/if}

  {#if onNavigateToRegister}
    <p class="text-center text-sm text-muted-foreground">
      Don't have an account yet? <button type="button" onclick={onNavigateToRegister} class={linkClass}>Sign up</button>
    </p>
  {/if}
</form>
