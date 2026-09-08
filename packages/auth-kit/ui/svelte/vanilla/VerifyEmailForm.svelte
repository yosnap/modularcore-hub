<script lang="ts">
  import '../../vanilla-styles.css';
  import { buildResendVerificationSchema } from '../../../core/validation.js';
  import TurnstileWidget from '../TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../../core/field-config.js';

  let {
    authKit,
    token,
    email: initialEmail,
    turnstile,
  }: { authKit: AuthKitRune; token?: string; email?: string; turnstile?: TurnstileFieldConfig } = $props();

  let email = $state(initialEmail ?? '');
  let turnstileToken: string | null = $state(null);
  let fieldErrors: Record<string, string> = $state({});
  let verifyAttempted = false;

  const verifyFlow = $derived(authKit.state.verifyEmail);
  const resendFlow = $derived(authKit.state.resendVerification);

  $effect(() => {
    if (!token || verifyAttempted) return;
    verifyAttempted = true;
    void authKit.verifyEmail({ token }).catch(() => {});
  });

  function handleResendSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildResendVerificationSchema().safeParse({ email });
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit.resendVerification({ email, turnstileToken }).catch(() => {});
  }
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<div>
  {#if token}
    <div role="status" class="auth-kit-status">
      {#if verifyFlow.status === 'submitting'}<p>Verifying your email…</p>{/if}
      {#if verifyFlow.status === 'success'}<p class="auth-kit-success">Your email is verified.</p>{/if}
      {#if verifyFlow.status === 'error' && verifyFlow.error}<p class="auth-kit-error">{verifyFlow.error.message}</p>{/if}
    </div>
  {/if}

  <form onsubmit={handleResendSubmit} novalidate class="auth-kit-form">
    <label class="auth-kit-field" for="auth-kit-resend-email">
      Email
      <input id="auth-kit-resend-email" type="email" bind:value={email} autocomplete="email" class="auth-kit-input" />
    </label>
    {#if fieldErrors.email}<p class="auth-kit-error">{fieldErrors.email}</p>{/if}
    {#if turnstile?.enabled}
      <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
    {/if}
    <button type="submit" disabled={resendFlow.status === 'submitting'} class="auth-kit-button">
      {resendFlow.status === 'submitting' ? 'Sending…' : 'Resend verification email'}
    </button>
    {#if resendFlow.status === 'error' && resendFlow.error}<p class="auth-kit-error">{resendFlow.error.message}</p>{/if}
    {#if resendFlow.status === 'success'}<p class="auth-kit-success">Verification email sent.</p>{/if}
  </form>
</div>
