import { mountTurnstileWidget, TurnstileController } from '../../../core/turnstile.js';
import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface MountForgotPasswordFormOptions {
  authKit: AuthKitStore;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToLogin?: () => void;
}

/** Vanilla CSS variant — same options/behavior as headless, styled with `auth-kit-*` classes. */
export function mountForgotPasswordForm(
  container: HTMLElement,
  { authKit, turnstile, onNavigateToLogin }: MountForgotPasswordFormOptions,
): () => void {
  const email = field('Email', { id: 'auth-kit-forgot-email', type: 'email', autocomplete: 'email' }, { label: 'auth-kit-field', input: 'auth-kit-input' });
  const emailError = errorText('auth-kit-error');
  const submit = el('button', { type: 'submit', class: 'auth-kit-button auth-kit-button--primary' }, ['Send reset link']);
  const submitError = errorText('auth-kit-error');
  const success = el('p', { class: 'auth-kit-success' });
  success.hidden = true;

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  const rows: HTMLElement[] = [email.label, emailError.node];
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

  let loginLink: HTMLButtonElement | undefined;
  if (onNavigateToLogin) {
    loginLink = el('button', { type: 'button', class: 'auth-kit-button auth-kit-button--ghost' }, ['Sign in']);
    rows.push(el('p', { class: 'auth-kit-status' }, ['Remembered your password? ', loginLink]));
  }

  const form = el('form', { novalidate: '', class: 'auth-kit-form' }, rows);
  container.append(form);

  loginLink?.addEventListener('click', () => onNavigateToLogin?.());

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.forgotPassword;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Sending…' : 'Send reset link';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Check your email for a reset link.' : '';
  });

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const result = buildForgotPasswordSchema().safeParse({ email: email.input.value });
    if (!result.success) {
      emailError.setText(result.error.issues[0]?.message);
      return;
    }
    emailError.setText(null);
    void authKit.forgotPassword({ email: email.input.value, turnstileToken }).catch(() => {});
  };
  
  email.input.addEventListener('blur', () => {
    const result = buildForgotPasswordSchema().safeParse({ email: email.input.value });
    emailError.setText(extractFieldError(result, 'email'));
  });
  email.input.addEventListener('input', () => emailError.setText(null));

  form.addEventListener('submit', handleSubmit);

  return () => {
    form.removeEventListener('submit', handleSubmit);
    unsubscribe();
    unmountTurnstile?.();
    form.remove();
  };
}
