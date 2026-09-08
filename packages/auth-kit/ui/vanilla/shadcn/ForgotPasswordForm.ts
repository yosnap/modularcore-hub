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

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LABEL_CLASS = 'text-sm font-medium leading-none';
const ERROR_CLASS = 'text-sm text-destructive';
const LINK_CLASS = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same options/behavior as headless. */
export function mountForgotPasswordForm(
  container: HTMLElement,
  { authKit, turnstile, onNavigateToLogin }: MountForgotPasswordFormOptions,
): () => void {
  const email = field('Email', { id: 'auth-kit-forgot-email', type: 'email', autocomplete: 'email' }, { label: LABEL_CLASS, input: INPUT_CLASS });
  const emailError = errorText(ERROR_CLASS);
  const submit = el(
    'button',
    {
      type: 'submit',
      class: 'inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50',
    },
    ['Send reset link'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600' });
  success.hidden = true;

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  const rows: HTMLElement[] = [el('div', { class: 'flex flex-col gap-1.5' }, [email.label, emailError.node])];
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
    loginLink = el('button', { type: 'button', class: LINK_CLASS }, ['Sign in']);
    rows.push(el('p', { class: 'text-center text-sm text-muted-foreground' }, ['Remembered your password? ', loginLink]));
  }

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-4' }, rows);
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
