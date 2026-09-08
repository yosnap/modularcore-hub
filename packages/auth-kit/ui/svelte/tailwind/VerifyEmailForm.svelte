<script lang="ts">
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

  const inputClass = 'rounded-md border border-zinc-300 px-2 py-1.5 text-sm';
  const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700';
  const errorClass = 'text-sm text-red-600';

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

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<div class="flex flex-col gap-4">
  {#if token}
    <div role="status" class="text-sm">
      {#if verifyFlow.status === 'submitting'}<p class="text-zinc-700">Verifying your email…</p>{/if}
      {#if verifyFlow.status === 'success'}<p class="text-green-600">Your email is verified.</p>{/if}
      {#if verifyFlow.status === 'error' && verifyFlow.error}<p class={errorClass}>{verifyFlow.error.message}</p>{/if}
    </div>
  {/if}

  <form onsubmit={handleResendSubmit} novalidate class="flex flex-col gap-3">
    <label class={labelClass} for="auth-kit-resend-email">
      Email
      <input id="auth-kit-resend-email" type="email" bind:value={email} autocomplete="email" class={inputClass} />
    </label>
    {#if fieldErrors.email}<p class={errorClass}>{fieldErrors.email}</p>{/if}
    {#if turnstile?.enabled}
      <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
    {/if}
    <button
      type="submit"
      disabled={resendFlow.status === 'submitting'}
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
    >
      {resendFlow.status === 'submitting' ? 'Sending…' : 'Resend verification email'}
    </button>
    {#if resendFlow.status === 'error' && resendFlow.error}<p class={errorClass}>{resendFlow.error.message}</p>{/if}
    {#if resendFlow.status === 'success'}<p class="text-sm text-green-600">Verification email sent.</p>{/if}
  </form>
</div>
