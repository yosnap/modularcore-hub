import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';
import { buildLoginSchema, extractFieldError } from '../../core/validation.js';
import { el, errorText, field } from './internal/dom.js';

import type { AuthKitStore } from '../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

export interface MountLoginFormOptions {
  authKit: AuthKitStore;
  turnstile?: TurnstileFieldConfig;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same options/behavior across every presentation. */
export function mountLoginForm(
  container: HTMLElement,
  { authKit, turnstile }: MountLoginFormOptions,
): () => void {
  const identifier = field('Correo electrónico o nombre de usuario', {
    id: 'auth-kit-login-identifier',
    type: 'text',
    autocomplete: 'username',
  });
  const password = field('Contraseña', {
    id: 'auth-kit-login-password',
    type: 'password',
    autocomplete: 'current-password',
  });
  const toggleShow = el('button', { type: 'button' }, ['Mostrar']);
  const identifierError = errorText();
  const passwordError = errorText();
  const submitError = errorText();
  const success = el('p');
  success.hidden = true;
  const submit = el('button', { type: 'submit' }, ['Iniciar sesión']);

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  let turnstileContainer: HTMLDivElement | undefined;
  if (turnstile?.enabled) {
    turnstileContainer = el('div');
    const controller = new TurnstileController({
      siteKey: turnstile.siteKey,
      theme: turnstile.theme,
      mode: turnstile.mode,
    });
    controller.subscribe((state) => {
      turnstileToken = state.token;
    });
    unmountTurnstile = mountTurnstileWidget(turnstileContainer, controller);
  }

  const passwordField = el('div', {}, [password.label, toggleShow]);
  const form = el('form', { novalidate: '' }, [
    el('div', {}, [identifier.label, identifierError.node]),
    el('div', {}, [passwordField, passwordError.node]),
    ...(turnstileContainer ? [turnstileContainer] : []),
    submit,
    submitError.node,
    success,
  ]);
  container.append(form);

  toggleShow.addEventListener('click', () => {
    const showing = password.input.type === 'text';
    password.input.type = showing ? 'password' : 'text';
    toggleShow.textContent = showing ? 'Mostrar' : 'Ocultar';
  });

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.login;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Sesión iniciada.' : '';
  });

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const values = { identifier: identifier.input.value, password: password.input.value };
    const result = buildLoginSchema().safeParse(values);
    if (!result.success) {
      const issues = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      identifierError.setText(issues.identifier);
      passwordError.setText(issues.password);
      return;
    }
    identifierError.setText(null);
    passwordError.setText(null);
    void authKit.login({ ...values, turnstileToken }).catch(() => {});
  };

  identifier.input.addEventListener('blur', () => {
    const result = buildLoginSchema().safeParse({
      identifier: identifier.input.value,
      password: password.input.value,
    });
    identifierError.setText(extractFieldError(result, 'identifier'));
  });
  identifier.input.addEventListener('input', () => identifierError.setText(null));
  password.input.addEventListener('blur', () => {
    const result = buildLoginSchema().safeParse({
      identifier: identifier.input.value,
      password: password.input.value,
    });
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
