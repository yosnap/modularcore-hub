import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';
import { eyeSvg } from '../icons.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface MountResetPasswordFormOptions {
  authKit: AuthKitStore;
  token: string;
  passwordPolicy?: PasswordPolicy;
}

const INPUT_CLASS =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const ERROR_CLASS = 'text-sm text-red-600 dark:text-red-400';
const EYE_BUTTON_CLASS =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

/** Tailwind variant — same options/behavior as headless, styled with the media-picker zinc palette. */
export function mountResetPasswordForm(container: HTMLElement, { authKit, token, passwordPolicy }: MountResetPasswordFormOptions): () => void {
  const next = field(
    'Contraseña nueva',
    { id: 'auth-kit-reset-new', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const nextError = errorText(ERROR_CLASS);
  const showPassword = el('button', { type: 'button', 'aria-label': 'Mostrar contraseña', class: EYE_BUTTON_CLASS });
  showPassword.innerHTML = eyeSvg(true);
  const nextWrapper = el('div', { class: 'relative' }, [next.input, showPassword]);

  const confirm = field(
    'Confirmar contraseña nueva',
    { id: 'auth-kit-reset-confirm', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: INPUT_CLASS },
  );
  const confirmError = errorText(ERROR_CLASS);
  const submit = el(
    'button',
    {
      type: 'submit',
      class:
        'rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300',
    },
    ['Restablecer contraseña'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600 dark:text-green-400' });
  success.hidden = true;

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-3' }, [
    next.label,
    nextWrapper,
    nextError.node,
    confirm.label,
    confirmError.node,
    submit,
    submitError.node,
    success,
  ]);
  container.append(form);

  showPassword.addEventListener('click', () => {
    const showing = next.input.type === 'text';
    next.input.type = showing ? 'password' : 'text';
    confirm.input.type = next.input.type;
    showPassword.innerHTML = eyeSvg(showing);
    showPassword.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.resetPassword;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Restableciendo…' : 'Restablecer contraseña';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Contraseña restablecida.' : '';
  });

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const values = { newPassword: next.input.value, confirmPassword: confirm.input.value };
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse(values);
    if (!result.success) {
      const issues = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      nextError.setText(issues.newPassword);
      confirmError.setText(issues.confirmPassword);
      return;
    }
    nextError.setText(null);
    confirmError.setText(null);
    void authKit.resetPassword({ token, newPassword: values.newPassword }).catch(() => {});
  };
  
  next.input.addEventListener('blur', () => {
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({ newPassword: next.input.value, confirmPassword: confirm.input.value });
    nextError.setText(extractFieldError(result, 'newPassword'));
  });
  next.input.addEventListener('input', () => nextError.setText(null));
  confirm.input.addEventListener('blur', () => {
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({ newPassword: next.input.value, confirmPassword: confirm.input.value });
    confirmError.setText(extractFieldError(result, 'confirmPassword'));
  });
  confirm.input.addEventListener('input', () => confirmError.setText(null));

  form.addEventListener('submit', handleSubmit);

  return () => {
    form.removeEventListener('submit', handleSubmit);
    unsubscribe();
    form.remove();
  };
}
