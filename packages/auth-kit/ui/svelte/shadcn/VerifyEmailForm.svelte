<script lang="ts">
  import '../../shadcn-theme.css';
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

  const inputClass =
    'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelClass = 'text-sm font-medium leading-none';
  const errorClass = 'text-sm text-destructive';

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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<div class="flex flex-col gap-4">
  {#if token}
    <div role="status" class="text-sm">
      {#if verifyFlow.status === 'submitting'}<p class="text-muted-foreground">Verificando tu email…</p>{/if}
      {#if verifyFlow.status === 'success'}<p class="text-green-600">Tu email está verificado.</p>{/if}
      {#if verifyFlow.status === 'error' && verifyFlow.error}<p class={errorClass}>{verifyFlow.error.message}</p>{/if}
    </div>
  {/if}

  <form onsubmit={handleResendSubmit} novalidate class="flex flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label class={labelClass} for="auth-kit-resend-email">Correo electrónico</label>
      <input id="auth-kit-resend-email" type="email" bind:value={email} autocomplete="email" class={inputClass} />
      {#if fieldErrors.email}<p class={errorClass}>{fieldErrors.email}</p>{/if}
    </div>
    {#if turnstile?.enabled}
      <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
    {/if}
    <button
      type="submit"
      disabled={resendFlow.status === 'submitting'}
      class="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
    >
      {resendFlow.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación'}
    </button>
    {#if resendFlow.status === 'error' && resendFlow.error}<p class={errorClass}>{resendFlow.error.message}</p>{/if}
    {#if resendFlow.status === 'success'}<p class="text-sm text-green-600">Email de verificación enviado.</p>{/if}
  </form>
</div>
