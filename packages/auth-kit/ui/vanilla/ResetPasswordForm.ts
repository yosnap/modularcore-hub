import { buildResetPasswordSchema, extractFieldError } from '../../core/validation.js';
import { el, errorText, field } from './internal/dom.js';

import type { AuthKitStore } from '../../adapters/vanilla/create-auth-kit-store.js';
import type { PasswordPolicy } from '../../core/validation.js';

export interface MountResetPasswordFormOptions {
  authKit: AuthKitStore;
  token: string;
  passwordPolicy?: PasswordPolicy;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same options/behavior across every presentation. */
export function mountResetPasswordForm(container: HTMLElement, { authKit, token, passwordPolicy }: MountResetPasswordFormOptions): () => void {
  const next = field('New password', { id: 'auth-kit-reset-new', type: 'password', autocomplete: 'new-password' });
  const nextError = errorText();
  const showPassword = el('button', { type: 'button' }, ['Show']);
  const confirm = field('Confirm new password', { id: 'auth-kit-reset-confirm', type: 'password', autocomplete: 'new-password' });
  const confirmError = errorText();
  const submit = el('button', { type: 'submit' }, ['Reset password']);
  const submitError = errorText();
  const success = el('p');
  success.hidden = true;

  const form = el('form', { novalidate: '' }, [
    el('div', {}, [el('div', {}, [next.label, showPassword]), nextError.node]),
    el('div', {}, [confirm.label, confirmError.node]),
    submit,
    submitError.node,
    success,
  ]);
  container.append(form);

  showPassword.addEventListener('click', () => {
    const showing = next.input.type === 'text';
    next.input.type = showing ? 'password' : 'text';
    confirm.input.type = next.input.type;
    showPassword.textContent = showing ? 'Show' : 'Hide';
  });

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.resetPassword;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Resetting…' : 'Reset password';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Password reset.' : '';
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
