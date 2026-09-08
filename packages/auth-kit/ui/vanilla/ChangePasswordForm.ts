import { buildChangePasswordSchema, extractFieldError } from '../../core/validation.js';
import { el, errorText, field } from './internal/dom.js';

import type { AuthKitStore } from '../../adapters/vanilla/create-auth-kit-store.js';
import type { PasswordPolicy } from '../../core/validation.js';

export interface MountChangePasswordFormOptions {
  authKit: AuthKitStore;
  passwordPolicy?: PasswordPolicy;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same options/behavior across every presentation. */
export function mountChangePasswordForm(container: HTMLElement, { authKit, passwordPolicy }: MountChangePasswordFormOptions): () => void {
  const current = field('Contraseña actual', { id: 'auth-kit-change-current', type: 'password', autocomplete: 'current-password' });
  const currentError = errorText();
  const showCurrent = el('button', { type: 'button' }, ['Mostrar']);
  const next = field('Contraseña nueva', { id: 'auth-kit-change-new', type: 'password', autocomplete: 'new-password' });
  const nextError = errorText();
  const showNew = el('button', { type: 'button' }, ['Mostrar']);
  const confirm = field('Confirmar contraseña nueva', { id: 'auth-kit-change-confirm', type: 'password', autocomplete: 'new-password' });
  const confirmError = errorText();
  const submit = el('button', { type: 'submit' }, ['Actualizar contraseña']);
  const submitError = errorText();
  const success = el('p');
  success.hidden = true;

  const form = el('form', { novalidate: '' }, [
    el('div', {}, [el('div', {}, [current.label, showCurrent]), currentError.node]),
    el('div', {}, [el('div', {}, [next.label, showNew]), nextError.node]),
    el('div', {}, [confirm.label, confirmError.node]),
    submit,
    submitError.node,
    success,
  ]);
  container.append(form);

  showCurrent.addEventListener('click', () => {
    const showing = current.input.type === 'text';
    current.input.type = showing ? 'password' : 'text';
    showCurrent.textContent = showing ? 'Mostrar' : 'Ocultar';
  });
  showNew.addEventListener('click', () => {
    const showing = next.input.type === 'text';
    next.input.type = showing ? 'password' : 'text';
    confirm.input.type = next.input.type;
    showNew.textContent = showing ? 'Mostrar' : 'Ocultar';
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
