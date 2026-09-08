<script lang="ts">
  import { buildLoginSchema, extractFieldError } from '../../core/validation.js';
  import TurnstileWidget from './TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../core/field-config.js';

  let { authKit, turnstile }: { authKit: AuthKitRune; turnstile?: TurnstileFieldConfig } = $props();

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<form onsubmit={handleSubmit} novalidate>
  <div>
    <label for="auth-kit-login-identifier">Email or username</label>
    <input id="auth-kit-login-identifier" type="text" bind:value={identifier} oninput={() => clearError('identifier')} onblur={() => validateField('identifier')} autocomplete="username" />
    {#if fieldErrors.identifier}<p role="alert">{fieldErrors.identifier}</p>{/if}
  </div>
  <div>
    <label for="auth-kit-login-password">Password</label>
    <input
      id="auth-kit-login-password"
      type={showPassword ? 'text' : 'password'}
      bind:value={password} oninput={() => clearError('password')} onblur={() => validateField('password')}
      autocomplete="current-password"
    />
    <button type="button" onclick={() => (showPassword = !showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
    {#if fieldErrors.password}<p role="alert">{fieldErrors.password}</p>{/if}
  </div>
  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}
  <button type="submit" disabled={flow.status === 'submitting'}>
    {flow.status === 'submitting' ? 'Signing in…' : 'Sign in'}
  </button>
  {#if flow.status === 'error' && flow.error}<p role="alert">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p>Signed in.</p>{/if}
</form>
