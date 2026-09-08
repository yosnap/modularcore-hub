<script lang="ts">
  import '../../shadcn-theme.css';
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
    'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelClass = 'text-sm font-medium leading-none';
  const errorClass = 'text-sm text-destructive';
  const linkClass = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

  let email = $state('');
  let turnstileToken: string | null = $state(null);
  let fieldErrors: Record<string, string> = $state({});


  /** Validates the field on blur — shows its error immediately instead of waiting for submit. */
  function onEmailBlur(): void {
    const result = buildForgotPasswordSchema().safeParse({ email });
    const message = extractFieldError(result, 'email');
    if (message) {
      fieldErrors = { ...fieldErrors, email: message };
    } else if ('email' in fieldErrors) {
      const { email: _removed, ...rest } = fieldErrors;
      fieldErrors = rest;
    }
  }

  function clearEmailError(): void {
    if ('email' in fieldErrors) {
      const { email: _removed, ...rest } = fieldErrors;
      fieldErrors = rest;
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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-forgot-email">Email</label>
    <input id="auth-kit-forgot-email" type="email" bind:value={email}
      oninput={clearEmailError}
      onblur={onEmailBlur}
      autocomplete="email"
      class={inputClass}
    />
    {#if fieldErrors.email}<p class={errorClass}>{fieldErrors.email}</p>{/if}
  </div>
  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}
  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
  >
    {flow.status === 'submitting' ? 'Sending…' : 'Send reset link'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600">Check your email for a reset link.</p>{/if}

  {#if onNavigateToLogin}
    <p class="text-center text-sm text-muted-foreground">
      Remembered your password? <button type="button" onclick={onNavigateToLogin} class={linkClass}>Sign in</button>
    </p>
  {/if}
</form>
