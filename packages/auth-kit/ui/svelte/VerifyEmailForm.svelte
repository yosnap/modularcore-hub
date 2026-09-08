<script lang="ts">
  import { buildResendVerificationSchema } from '../../core/validation.js';
  import TurnstileWidget from './TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../core/field-config.js';

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<div>
  {#if token}
    <div role="status">
      {#if verifyFlow.status === 'submitting'}<p>Verificando tu email…</p>{/if}
      {#if verifyFlow.status === 'success'}<p>Tu email está verificado.</p>{/if}
      {#if verifyFlow.status === 'error' && verifyFlow.error}<p role="alert">{verifyFlow.error.message}</p>{/if}
    </div>
  {/if}

  <form onsubmit={handleResendSubmit} novalidate>
    <div>
      <label for="auth-kit-resend-email">Correo electrónico</label>
      <input id="auth-kit-resend-email" type="email" bind:value={email} autocomplete="email" />
      {#if fieldErrors.email}<p role="alert">{fieldErrors.email}</p>{/if}
    </div>
    {#if turnstile?.enabled}
      <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
    {/if}
    <button type="submit" disabled={resendFlow.status === 'submitting'}>
      {resendFlow.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación'}
    </button>
    {#if resendFlow.status === 'error' && resendFlow.error}<p role="alert">{resendFlow.error.message}</p>{/if}
    {#if resendFlow.status === 'success'}<p>Email de verificación enviado.</p>{/if}
  </form>
</div>
