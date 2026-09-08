import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';
import { buildResendVerificationSchema } from '../../core/validation.js';
import { el, errorText, field, statusText } from './internal/dom.js';

import type { AuthKitStore } from '../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

export interface MountVerifyEmailFormOptions {
  authKit: AuthKitStore;
  token?: string;
  email?: string;
  turnstile?: TurnstileFieldConfig;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same options/behavior across every presentation. */
export function mountVerifyEmailForm(
  container: HTMLElement,
  { authKit, token, email: initialEmail, turnstile }: MountVerifyEmailFormOptions,
): () => void {
  const verifyStatus = statusText();
  const email = field('Correo electrónico', {
    id: 'auth-kit-resend-email',
    type: 'email',
    autocomplete: 'email',
  });
  email.input.value = initialEmail ?? '';
  const emailError = errorText();
  const submit = el('button', { type: 'submit' }, ['Reenviar email de verificación']);
  const submitError = errorText();
  const success = el('p');
  success.hidden = true;

  const rows: HTMLElement[] = [el('div', {}, [email.label, emailError.node])];

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  if (turnstile?.enabled) {
    const turnstileContainer = el('div');
    const controller = new TurnstileController({
      siteKey: turnstile.siteKey,
      theme: turnstile.theme,
      mode: turnstile.mode,
    });
    controller.subscribe((state) => {
      turnstileToken = state.token;
    });
    unmountTurnstile = mountTurnstileWidget(turnstileContainer, controller);
    rows.push(turnstileContainer);
  }
  rows.push(submit, submitError.node, success);

  const resendForm = el('form', { novalidate: '' }, rows);
  const verifyStatusWrapper = el('div', { role: 'status' }, [verifyStatus.node]);
  const root = el('div', {}, token ? [verifyStatusWrapper, resendForm] : [resendForm]);
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
