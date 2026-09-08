import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';
import { eyeSvg } from '../icons.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface MountChangePasswordFormOptions {
  authKit: AuthKitStore;
  passwordPolicy?: PasswordPolicy;
}

/** Vanilla CSS variant — same options/behavior as headless, styled with `auth-kit-*` classes. */
export function mountChangePasswordForm(container: HTMLElement, { authKit, passwordPolicy }: MountChangePasswordFormOptions): () => void {
  const current = field(
    'Contraseña actual',
    { id: 'auth-kit-change-current', type: 'password', autocomplete: 'current-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const currentError = errorText('auth-kit-error');
  const showCurrent = el('button', { type: 'button', 'aria-label': 'Mostrar contraseña', class: 'auth-kit-eye-button' });
  showCurrent.innerHTML = eyeSvg(true);
  const currentWrapper = el('div', { class: 'auth-kit-field__control' }, [current.input, showCurrent]);

  const next = field(
    'Contraseña nueva',
    { id: 'auth-kit-change-new', type: 'password', autocomplete: 'new-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const nextError = errorText('auth-kit-error');
  const showNew = el('button', { type: 'button', 'aria-label': 'Mostrar contraseña', class: 'auth-kit-eye-button' });
  showNew.innerHTML = eyeSvg(true);
  const nextWrapper = el('div', { class: 'auth-kit-field__control' }, [next.input, showNew]);

  const confirm = field(
    'Confirmar contraseña nueva',
    { id: 'auth-kit-change-confirm', type: 'password', autocomplete: 'new-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const confirmError = errorText('auth-kit-error');
  const submit = el('button', { type: 'submit', class: 'auth-kit-button auth-kit-button--primary' }, ['Actualizar contraseña']);
  const submitError = errorText('auth-kit-error');
  const success = el('p', { class: 'auth-kit-success' });
  success.hidden = true;

  const form = el('form', { novalidate: '', class: 'auth-kit-form' }, [
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
    showCurrent.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
  showNew.addEventListener('click', () => {
    const showing = next.input.type === 'text';
    next.input.type = showing ? 'password' : 'text';
    confirm.input.type = next.input.type;
    showNew.innerHTML = eyeSvg(showing);
    showNew.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.changePassword;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Actualizando…' : 'Actualizar contraseña';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Contraseña actualizada.' : '';
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
