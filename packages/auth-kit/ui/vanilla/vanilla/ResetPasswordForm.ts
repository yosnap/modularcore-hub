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

/** Vanilla CSS variant — same options/behavior as headless, styled with `auth-kit-*` classes. */
export function mountResetPasswordForm(
  container: HTMLElement,
  { authKit, token, passwordPolicy }: MountResetPasswordFormOptions,
): () => void {
  const next = field(
    'Contraseña nueva',
    { id: 'auth-kit-reset-new', type: 'password', autocomplete: 'new-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const nextError = errorText('auth-kit-error');
  const showPassword = el('button', {
    type: 'button',
    'aria-label': 'Mostrar contraseña',
    class: 'auth-kit-eye-button',
  });
  showPassword.innerHTML = eyeSvg(true);
  const nextWrapper = el('div', { class: 'auth-kit-field__control' }, [next.input, showPassword]);

  const confirm = field(
    'Confirmar contraseña nueva',
    { id: 'auth-kit-reset-confirm', type: 'password', autocomplete: 'new-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const confirmError = errorText('auth-kit-error');
  const submit = el(
    'button',
    { type: 'submit', class: 'auth-kit-button auth-kit-button--primary' },
    ['Restablecer contraseña'],
  );
  const submitError = errorText('auth-kit-error');
  const success = el('p', { class: 'auth-kit-success' });
  success.hidden = true;

  const form = el('form', { novalidate: '', class: 'auth-kit-form' }, [
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
      const issues = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      nextError.setText(issues.newPassword);
      confirmError.setText(issues.confirmPassword);
      return;
    }
    nextError.setText(null);
    confirmError.setText(null);
    void authKit.resetPassword({ token, newPassword: values.newPassword }).catch(() => {});
  };

  next.input.addEventListener('blur', () => {
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({
      newPassword: next.input.value,
      confirmPassword: confirm.input.value,
    });
    nextError.setText(extractFieldError(result, 'newPassword'));
  });
  next.input.addEventListener('input', () => nextError.setText(null));
  confirm.input.addEventListener('blur', () => {
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({
      newPassword: next.input.value,
      confirmPassword: confirm.input.value,
    });
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
