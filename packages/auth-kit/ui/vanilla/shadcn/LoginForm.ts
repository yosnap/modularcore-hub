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

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LABEL_CLASS = 'text-sm font-medium leading-none';
const ERROR_CLASS = 'text-sm text-destructive';
const LINK_CLASS =
  'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens (`ui/shadcn-theme.css`). Same options/behavior as headless. */
export function mountLoginForm(
  container: HTMLElement,
  { authKit, turnstile, onNavigateToRegister, onNavigateToForgotPassword }: MountLoginFormOptions,
): () => void {
  const identifier = field(
    'Correo electrónico o nombre de usuario',
    { id: 'auth-kit-login-identifier', type: 'text', autocomplete: 'username' },
    { label: LABEL_CLASS, input: INPUT_CLASS },
  );
  const password = field(
    'Contraseña',
    { id: 'auth-kit-login-password', type: 'password', autocomplete: 'current-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const toggleShow = el('button', {
    type: 'button',
    'aria-label': 'Mostrar contraseña',
    class:
      'absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground',
  });
  toggleShow.innerHTML = eyeSvg(true);
  const passwordWrapper = el('div', { class: 'relative' }, [password.input, toggleShow]);
  const identifierError = errorText(ERROR_CLASS);
  const passwordError = errorText(ERROR_CLASS);
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600' });
  success.hidden = true;
  const submit = el(
    'button',
    {
      type: 'submit',
      class:
        'inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50',
    },
    ['Iniciar sesión'],
  );

  const passwordLabelRow = el('div', { class: 'flex items-center justify-between' }, [
    password.label,
  ]);
  let forgotLink: HTMLButtonElement | undefined;
  if (onNavigateToForgotPassword) {
    forgotLink = el('button', { type: 'button', class: LINK_CLASS }, ['¿Olvidaste tu contraseña?']);
    passwordLabelRow.append(forgotLink);
  }

  let registerFooter: HTMLParagraphElement | undefined;
  let registerLink: HTMLButtonElement | undefined;
  if (onNavigateToRegister) {
    registerLink = el('button', { type: 'button', class: LINK_CLASS }, ['Registrarse']);
    registerFooter = el('p', { class: 'text-center text-sm text-muted-foreground' }, [
      '¿Aún no tienes una cuenta? ',
      registerLink,
    ]);
  }

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

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-4' }, [
    el('div', { class: 'flex flex-col gap-1.5' }, [identifier.label, identifierError.node]),
    el('div', { class: 'flex flex-col gap-1.5' }, [
      passwordLabelRow,
      passwordWrapper,
      passwordError.node,
    ]),
    ...(turnstileContainer ? [turnstileContainer] : []),
    submit,
    submitError.node,
    success,
    ...(registerFooter ? [registerFooter] : []),
  ]);
  container.append(form);

  toggleShow.addEventListener('click', () => {
    const showing = password.input.type === 'text';
    password.input.type = showing ? 'password' : 'text';
    toggleShow.innerHTML = eyeSvg(showing);
    toggleShow.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
  forgotLink?.addEventListener('click', () => onNavigateToForgotPassword?.());
  registerLink?.addEventListener('click', () => onNavigateToRegister?.());

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
