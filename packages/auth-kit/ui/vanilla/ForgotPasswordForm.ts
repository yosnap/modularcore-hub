import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';
import { buildForgotPasswordSchema, extractFieldError } from '../../core/validation.js';
import { el, errorText, field } from './internal/dom.js';

import type { AuthKitStore } from '../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

export interface MountForgotPasswordFormOptions {
  authKit: AuthKitStore;
  turnstile?: TurnstileFieldConfig;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same options/behavior across every presentation. */
export function mountForgotPasswordForm(container: HTMLElement, { authKit, turnstile }: MountForgotPasswordFormOptions): () => void {
  const email = field('Email', { id: 'auth-kit-forgot-email', type: 'email', autocomplete: 'email' });
  const emailError = errorText();
  const submit = el('button', { type: 'submit' }, ['Send reset link']);
  const submitError = errorText();
  const success = el('p');
  success.hidden = true;

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  const rows: HTMLElement[] = [el('div', {}, [email.label, emailError.node])];
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

  const form = el('form', { novalidate: '' }, rows);
  container.append(form);

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
