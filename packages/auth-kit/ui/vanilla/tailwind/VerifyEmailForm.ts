import { mountTurnstileWidget, TurnstileController } from '../../../core/turnstile.js';
import { buildResendVerificationSchema } from '../../../core/validation.js';
import { el, errorText, field, statusText } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface MountVerifyEmailFormOptions {
  authKit: AuthKitStore;
  token?: string;
  email?: string;
  turnstile?: TurnstileFieldConfig;
}

const INPUT_CLASS = 'rounded-md border border-zinc-300 px-2 py-1.5 text-sm';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-zinc-700';
const ERROR_CLASS = 'text-sm text-red-600';

/** Tailwind variant — same options/behavior as headless, styled with the media-picker zinc palette. */
export function mountVerifyEmailForm(container: HTMLElement, { authKit, token, email: initialEmail, turnstile }: MountVerifyEmailFormOptions): () => void {
  const verifyStatus = statusText('text-zinc-700');
  const email = field('Correo electrónico', { id: 'auth-kit-resend-email', type: 'email', autocomplete: 'email' }, { label: LABEL_CLASS, input: INPUT_CLASS });
  email.input.value = initialEmail ?? '';
  const emailError = errorText(ERROR_CLASS);
  const submit = el(
    'button',
    { type: 'submit', class: 'rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50' },
    ['Reenviar email de verificación'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600' });
  success.hidden = true;

  const rows: HTMLElement[] = [email.label, emailError.node];

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  if (turnstile?.enabled) {
    const turnstileContainer = el('div');
    const controller = new TurnstileController({ siteKey: turnstile.siteKey, theme: turnstile.theme, mode: turnstile.mode });
    controller.subscribe((state) => {
      turnstileToken = state.token;
    });
    unmountTurnstile = mountTurnstileWidget(turnstileContainer, controller);
    rows.push(turnstileContainer);
  }
  rows.push(submit, submitError.node, success);

  const resendForm = el('form', { novalidate: '', class: 'flex flex-col gap-3' }, rows);
  const verifyStatusWrapper = el('div', { role: 'status', class: 'text-sm' }, [verifyStatus.node]);
  const root = el('div', { class: 'flex flex-col gap-4' }, token ? [verifyStatusWrapper, resendForm] : [resendForm]);
  container.append(root);

  const unsubscribe = authKit.subscribe((state) => {
    if (token) {
      const { status: verifyState, error: verifyError } = state.verifyEmail;
      if (verifyState === 'submitting') verifyStatus.setText('Verificando tu email…');
      else if (verifyState === 'success') verifyStatus.setText('Tu email está verificado.');
      else if (verifyState === 'error') verifyStatus.setText(verifyError?.message);
      else verifyStatus.setText(null);
    }

    const { status, error } = state.resendVerification;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Email de verificación enviado.' : '';
  });

  if (token) void authKit.verifyEmail({ token }).catch(() => {});

  const handleResendSubmit = (event: Event): void => {
    event.preventDefault();
    const result = buildResendVerificationSchema().safeParse({ email: email.input.value });
    if (!result.success) {
      emailError.setText(result.error.issues[0]?.message);
      return;
    }
    emailError.setText(null);
    void authKit.resendVerification({ email: email.input.value, turnstileToken }).catch(() => {});
  };
  resendForm.addEventListener('submit', handleResendSubmit);

  return () => {
    resendForm.removeEventListener('submit', handleResendSubmit);
    unsubscribe();
    unmountTurnstile?.();
    root.remove();
  };
}
