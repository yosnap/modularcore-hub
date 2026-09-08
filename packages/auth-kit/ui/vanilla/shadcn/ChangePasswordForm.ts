import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';
import { checkSvg, eyeSvg } from '../icons.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface MountChangePasswordFormOptions {
  authKit: AuthKitStore;
  passwordPolicy?: PasswordPolicy;
}

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LABEL_CLASS = 'text-sm font-medium leading-none';
const ERROR_CLASS = 'text-sm text-destructive';

function strengthBarClass(index: number, score: number, total: number): string {
  if (index >= score) return 'bg-muted';
  if (score === total) return 'bg-green-500';
  if (score >= total - 1) return 'bg-yellow-500';
  return 'bg-destructive';
}

function mountEyeToggle(input: HTMLInputElement): { wrapper: HTMLDivElement; button: HTMLButtonElement } {
  const button = el('button', {
    type: 'button',
    'aria-label': 'Show password',
    class: 'absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground',
  });
  button.innerHTML = eyeSvg(true);
  button.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.innerHTML = eyeSvg(showing);
    button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
  const wrapper = el('div', { class: 'relative' }, [input, button]);
  return { wrapper, button };
}

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same options/behavior as headless. */
export function mountChangePasswordForm(container: HTMLElement, { authKit, passwordPolicy }: MountChangePasswordFormOptions): () => void {
  const current = field(
    'Current password',
    { id: 'auth-kit-change-current', type: 'password', autocomplete: 'current-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const currentError = errorText(ERROR_CLASS);
  const currentEye = mountEyeToggle(current.input);

  const next = field(
    'New password',
    { id: 'auth-kit-change-new', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const nextError = errorText(ERROR_CLASS);
  const nextEye = mountEyeToggle(next.input);
  const strengthBars = el('div', { class: 'flex gap-1' });
  const strengthList = el('ul', { class: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs' });
  const strengthBlock = el('div', { class: 'flex flex-col gap-1.5' }, [strengthBars, strengthList]);
  strengthBlock.hidden = true;

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
      class: 'inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50',
    },
    ['Update password'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600' });
  success.hidden = true;

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-4' }, [
    el('div', { class: 'flex flex-col gap-1.5' }, [current.label, currentEye.wrapper, currentError.node]),
    el('div', { class: 'flex flex-col gap-1.5' }, [next.label, nextEye.wrapper, strengthBlock, nextError.node]),
    el('div', { class: 'flex flex-col gap-1.5' }, [confirm.label, confirmError.node]),
    submit,
    submitError.node,
    success,
  ]);
  container.append(form);

  function updateStrength(): void {
    const value = next.input.value;
    strengthBlock.hidden = value.length === 0;
    if (value.length === 0) return;
    const strength = evaluatePasswordStrength(value, passwordPolicy);
    strengthBars.innerHTML = '';
    for (let index = 0; index < strength.total; index += 1) {
      strengthBars.append(el('span', { class: `h-1 flex-1 rounded-full ${strengthBarClass(index, strength.score, strength.total)}` }));
    }
    strengthList.innerHTML = '';
    for (const requirement of strength.requirements) {
      const item = el('li', { class: `flex items-center gap-1 ${requirement.met ? 'text-green-600' : 'text-muted-foreground'}` });
      item.innerHTML = requirement.met ? checkSvg() : '<span class="inline-block h-3 w-3" aria-hidden="true">·</span>';
      item.append(requirement.label);
      strengthList.append(item);
    }
  }
  next.input.addEventListener('input', updateStrength);

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
    next.input.removeEventListener('input', updateStrength);
    unsubscribe();
    form.remove();
  };
}
