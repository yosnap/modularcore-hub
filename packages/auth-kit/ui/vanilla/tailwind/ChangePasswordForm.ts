import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';
import { eyeSvg } from '../icons.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface MountChangePasswordFormOptions {
  authKit: AuthKitStore;
  passwordPolicy?: PasswordPolicy;
}

const INPUT_CLASS =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const ERROR_CLASS = 'text-sm text-red-600 dark:text-red-400';
const EYE_BUTTON_CLASS =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

/** Tailwind variant — same options/behavior as headless, styled with the media-picker zinc palette. */
export function mountChangePasswordForm(container: HTMLElement, { authKit, passwordPolicy }: MountChangePasswordFormOptions): () => void {
  const current = field(
    'Current password',
    { id: 'auth-kit-change-current', type: 'password', autocomplete: 'current-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const currentError = errorText(ERROR_CLASS);
  const showCurrent = el('button', { type: 'button', 'aria-label': 'Show password', class: EYE_BUTTON_CLASS });
  showCurrent.innerHTML = eyeSvg(true);
  const currentWrapper = el('div', { class: 'relative' }, [current.input, showCurrent]);

  const next = field(
    'New password',
    { id: 'auth-kit-change-new', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const nextError = errorText(ERROR_CLASS);
  const showNew = el('button', { type: 'button', 'aria-label': 'Show password', class: EYE_BUTTON_CLASS });
  showNew.innerHTML = eyeSvg(true);
  const nextWrapper = el('div', { class: 'relative' }, [next.input, showNew]);

  const confirm = field(
    'Confirm new password',
    { id: 'auth-kit-change-confirm', type: 'password', autocomplete: 'new-password' },
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
    ['Update password'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600 dark:text-green-400' });
  success.hidden = true;

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-3' }, [
    current.label,
    currentWrapper,
    currentError.node,
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

  showCurrent.addEventListener('click', () => {
    const showing = current.input.type === 'text';
    current.input.type = showing ? 'password' : 'text';
    showCurrent.innerHTML = eyeSvg(showing);
    showCurrent.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
  showNew.addEventListener('click', () => {
    const showing = next.input.type === 'text';
    next.input.type = showing ? 'password' : 'text';
    confirm.input.type = next.input.type;
    showNew.innerHTML = eyeSvg(showing);
    showNew.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.changePassword;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Updating…' : 'Update password';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Password updated.' : '';
  });

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const values = { currentPassword: current.input.value, newPassword: next.input.value, confirmPassword: confirm.input.value };
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse(values);
    if (!result.success) {
      const issues = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      currentError.setText(issues.currentPassword);
      nextError.setText(issues.newPassword);
      confirmError.setText(issues.confirmPassword);
      return;
    }
    currentError.setText(null);
    nextError.setText(null);
    confirmError.setText(null);
    void authKit.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).catch(() => {});
  };
  
  current.input.addEventListener('blur', () => {
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({ currentPassword: current.input.value, newPassword: next.input.value, confirmPassword: confirm.input.value });
    currentError.setText(extractFieldError(result, 'currentPassword'));
  });
  current.input.addEventListener('input', () => currentError.setText(null));
  next.input.addEventListener('blur', () => {
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({ currentPassword: current.input.value, newPassword: next.input.value, confirmPassword: confirm.input.value });
    nextError.setText(extractFieldError(result, 'newPassword'));
  });
  next.input.addEventListener('input', () => nextError.setText(null));
  confirm.input.addEventListener('blur', () => {
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({ currentPassword: current.input.value, newPassword: next.input.value, confirmPassword: confirm.input.value });
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
