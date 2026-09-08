import { mountTurnstileWidget, TurnstileController } from '../../../core/turnstile.js';
import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
import { eyeSvg } from '../icons.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface MountLoginFormOptions {
  authKit: AuthKitStore;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

/** Vanilla CSS variant — same options/behavior as headless, styled with `auth-kit-*` classes (see `ui/vanilla-styles.css`). */
export function mountLoginForm(
  container: HTMLElement,
  { authKit, turnstile, onNavigateToRegister, onNavigateToForgotPassword }: MountLoginFormOptions,
): () => void {
  const identifier = field(
    'Email or username',
    { id: 'auth-kit-login-identifier', type: 'text', autocomplete: 'username' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const password = field(
    'Password',
    { id: 'auth-kit-login-password', type: 'password', autocomplete: 'current-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const eyeButton = el('button', { type: 'button', 'aria-label': 'Show password', class: 'auth-kit-eye-button' });
  eyeButton.innerHTML = eyeSvg(true);
  const passwordWrapper = el('div', { class: 'auth-kit-field__control' }, [password.input, eyeButton]);
  const identifierError = errorText('auth-kit-error');
  const passwordError = errorText('auth-kit-error');
  const submitError = errorText('auth-kit-error');
  const success = el('p', { class: 'auth-kit-success' });
  success.hidden = true;
  const submit = el('button', { type: 'submit', class: 'auth-kit-button auth-kit-button--primary' }, ['Sign in']);

  const passwordLabelRow = el('div', { class: 'auth-kit-field__row', style: 'justify-content: space-between' }, [password.label]);
  let forgotLink: HTMLButtonElement | undefined;
  if (onNavigateToForgotPassword) {
    forgotLink = el('button', { type: 'button', class: 'auth-kit-button auth-kit-button--ghost' }, ['Forgot your password?']);
    passwordLabelRow.append(forgotLink);
  }

  let registerFooter: HTMLParagraphElement | undefined;
  let registerLink: HTMLButtonElement | undefined;
  if (onNavigateToRegister) {
    registerLink = el('button', { type: 'button', class: 'auth-kit-button auth-kit-button--ghost' }, ['Sign up']);
    registerFooter = el('p', { class: 'auth-kit-status' }, ["Don't have an account yet? ", registerLink]);
  }

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  let turnstileContainer: HTMLDivElement | undefined;
  if (turnstile?.enabled) {
    turnstileContainer = el('div');
    const controller = new TurnstileController({ siteKey: turnstile.siteKey, theme: turnstile.theme, mode: turnstile.mode });
    controller.subscribe((state) => {
      turnstileToken = state.token;
    });
    unmountTurnstile = mountTurnstileWidget(turnstileContainer, controller);
  }

  const form = el('form', { novalidate: '', class: 'auth-kit-form' }, [
    identifier.label,
    identifierError.node,
    passwordLabelRow,
    passwordWrapper,
    passwordError.node,
    ...(turnstileContainer ? [turnstileContainer] : []),
    submit,
    submitError.node,
    success,
    ...(registerFooter ? [registerFooter] : []),
  ]);
  container.append(form);

  eyeButton.addEventListener('click', () => {
    const showing = password.input.type === 'text';
    password.input.type = showing ? 'password' : 'text';
    eyeButton.innerHTML = eyeSvg(showing);
    eyeButton.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
  forgotLink?.addEventListener('click', () => onNavigateToForgotPassword?.());
  registerLink?.addEventListener('click', () => onNavigateToRegister?.());

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.login;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Signing in…' : 'Sign in';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Signed in.' : '';
  });

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const values = { identifier: identifier.input.value, password: password.input.value };
    const result = buildLoginSchema().safeParse(values);
    if (!result.success) {
      const issues = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      identifierError.setText(issues.identifier);
      passwordError.setText(issues.password);
      return;
    }
    identifierError.setText(null);
    passwordError.setText(null);
    void authKit.login({ ...values, turnstileToken }).catch(() => {});
  };
  
  identifier.input.addEventListener('blur', () => {
    const result = buildLoginSchema().safeParse({ identifier: identifier.input.value, password: password.input.value });
    identifierError.setText(extractFieldError(result, 'identifier'));
  });
  identifier.input.addEventListener('input', () => identifierError.setText(null));
  password.input.addEventListener('blur', () => {
    const result = buildLoginSchema().safeParse({ identifier: identifier.input.value, password: password.input.value });
    passwordError.setText(extractFieldError(result, 'password'));
  });
  password.input.addEventListener('input', () => passwordError.setText(null));

  form.addEventListener('submit', handleSubmit);

  return () => {
    form.removeEventListener('submit', handleSubmit);
    unsubscribe();
    unmountTurnstile?.();
    form.remove();
  };
}
