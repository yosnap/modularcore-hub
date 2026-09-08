import { resolveFieldConfig } from '../../../core/field-config.js';
import { mountTurnstileWidget, TurnstileController } from '../../../core/turnstile.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
import { eyeSvg } from '../icons.js';
import { el, errorText, field } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { AuthKitFieldConfig } from '../../../core/field-config.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface MountRegisterFormOptions {
  authKit: AuthKitStore;
  fieldConfig?: AuthKitFieldConfig;
  passwordPolicy?: PasswordPolicy;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToLogin?: () => void;
}

/** Vanilla CSS variant — same options/behavior as headless, styled with `auth-kit-*` classes. */
export function mountRegisterForm(
  container: HTMLElement,
  { authKit, fieldConfig, passwordPolicy, onNavigateToLogin }: MountRegisterFormOptions,
): () => void {
  const fields = resolveFieldConfig(fieldConfig);

  const email = field('Correo electrónico', { id: 'auth-kit-register-email', type: 'email', autocomplete: 'email' }, { label: 'auth-kit-field', input: 'auth-kit-input' });
  const emailError = errorText('auth-kit-error');
  const password = field(
    'Contraseña',
    { id: 'auth-kit-register-password', type: 'password', autocomplete: 'new-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const passwordError = errorText('auth-kit-error');
  const showPassword = el('button', { type: 'button', 'aria-label': 'Mostrar contraseña', class: 'auth-kit-eye-button' });
  showPassword.innerHTML = eyeSvg(true);
  const passwordWrapper = el('div', { class: 'auth-kit-field__control' }, [password.input, showPassword]);

  const confirmPassword = field(
    'Confirmar contraseña',
    { id: 'auth-kit-register-confirm-password', type: 'password', autocomplete: 'new-password' },
    { label: 'auth-kit-field', input: 'auth-kit-input' },
  );
  const confirmPasswordError = errorText('auth-kit-error');
  const showConfirm = el('button', { type: 'button', 'aria-label': 'Mostrar contraseña', class: 'auth-kit-eye-button' });
  showConfirm.innerHTML = eyeSvg(true);
  const confirmPasswordWrapper = el('div', { class: 'auth-kit-field__control' }, [confirmPassword.input, showConfirm]);

  const submit = el('button', { type: 'submit', class: 'auth-kit-button auth-kit-button--primary' }, ['Crear cuenta']);
  const submitError = errorText('auth-kit-error');
  const success = el('p', { class: 'auth-kit-success' });
  success.hidden = true;

  const rows: HTMLElement[] = [email.label, emailError.node];

  let firstName: ReturnType<typeof field> | undefined;
  if (fields.firstName.enabled) {
    firstName = field(fields.firstName.label, { id: 'auth-kit-register-firstname', type: 'text' }, { label: 'auth-kit-field', input: 'auth-kit-input' });
    rows.push(firstName.label);
  }
  let lastName: ReturnType<typeof field> | undefined;
  if (fields.lastName.enabled) {
    lastName = field(fields.lastName.label, { id: 'auth-kit-register-lastname', type: 'text' }, { label: 'auth-kit-field', input: 'auth-kit-input' });
    rows.push(lastName.label);
  }
  let phone: ReturnType<typeof field> | undefined;
  if (fields.phone.enabled) {
    phone = field(fields.phone.label, { id: 'auth-kit-register-phone', type: 'tel' }, { label: 'auth-kit-field', input: 'auth-kit-input' });
    rows.push(phone.label);
  }
  let profileTypeSelect: HTMLSelectElement | undefined;
  if (fields.profileType.enabled) {
    profileTypeSelect = el(
      'select',
      { id: 'auth-kit-register-profile-type', class: 'auth-kit-select' },
      fields.profileType.options.map((option) => el('option', { value: option.value }, [option.label])),
    );
    profileTypeSelect.value = fields.profileType.defaultValue;
    rows.push(el('label', { for: 'auth-kit-register-profile-type', class: 'auth-kit-field' }, [fields.profileType.label, profileTypeSelect]));
  }

  rows.push(password.label, passwordWrapper, passwordError.node);
  rows.push(confirmPassword.label, confirmPasswordWrapper, confirmPasswordError.node);

  let termsCheckbox: HTMLInputElement | undefined;
  const termsError = errorText('auth-kit-error');
  if (fields.legalConsent.enabled) {
    termsCheckbox = el('input', { id: 'auth-kit-register-terms', type: 'checkbox' });
    const links = fields.legalConsent.links.map((link, index) => {
      const anchor = el('a', { href: link.href, target: '_blank', rel: 'noreferrer' }, [link.label]);
      return index > 0 ? el('span', {}, [' ', anchor]) : anchor;
    });
    const label = el('label', { for: 'auth-kit-register-terms', class: 'auth-kit-checkbox-row' }, [termsCheckbox, fields.legalConsent.text, ' ', ...links]);
    rows.push(label, termsError.node);
  }

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  if (fields.turnstile.enabled) {
    const turnstileContainer = el('div');
    const controller = new TurnstileController({
      siteKey: fields.turnstile.siteKey,
      theme: fields.turnstile.theme,
      mode: fields.turnstile.mode,
    });
    controller.subscribe((state) => {
      turnstileToken = state.token;
    });
    unmountTurnstile = mountTurnstileWidget(turnstileContainer, controller);
    rows.push(turnstileContainer);
  }

  rows.push(submit, submitError.node, success);

  let loginLink: HTMLButtonElement | undefined;
  if (onNavigateToLogin) {
    loginLink = el('button', { type: 'button', class: 'auth-kit-button auth-kit-button--ghost' }, ['Iniciar sesión']);
    rows.push(el('p', { class: 'auth-kit-status' }, ['¿Ya tienes una cuenta? ', loginLink]));
  }

  const form = el('form', { novalidate: '', class: 'auth-kit-form' }, rows);
  container.append(form);

  showPassword.addEventListener('click', () => {
    const showing = password.input.type === 'text';
    password.input.type = showing ? 'password' : 'text';
    showPassword.innerHTML = eyeSvg(showing);
    showPassword.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
  showConfirm.addEventListener('click', () => {
    const showing = confirmPassword.input.type === 'text';
    confirmPassword.input.type = showing ? 'password' : 'text';
    showConfirm.innerHTML = eyeSvg(showing);
    showConfirm.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
  loginLink?.addEventListener('click', () => onNavigateToLogin?.());

  const unsubscribe = authKit.subscribe((state) => {
    const { status, error } = state.register;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Cuenta creada.' : '';
  });

  const handleSubmit = (event: Event): void => {
    event.preventDefault();
    const values: Record<string, unknown> = {
      email: email.input.value,
      password: password.input.value,
      confirmPassword: confirmPassword.input.value,
    };
    if (firstName) values.firstName = firstName.input.value;
    if (lastName) values.lastName = lastName.input.value;
    if (phone) values.phone = phone.input.value;
    if (profileTypeSelect) values.profileType = profileTypeSelect.value;
    if (termsCheckbox && fields.legalConsent.required) values.termsAccepted = termsCheckbox.checked;

    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(values);
    if (!result.success) {
      const issues = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      emailError.setText(issues.email);
      passwordError.setText(issues.password);
      confirmPasswordError.setText(issues.confirmPassword);
      termsError.setText(issues.termsAccepted);
      return;
    }
    emailError.setText(null);
    passwordError.setText(null);
    confirmPasswordError.setText(null);
    termsError.setText(null);

    void authKit
      .register({
        email: email.input.value,
        password: password.input.value,
        firstName: firstName?.input.value,
        lastName: lastName?.input.value,
        phone: phone?.input.value,
        profileType: profileTypeSelect?.value,
        termsAccepted: termsCheckbox?.checked,
        turnstileToken,
      })
      .catch(() => {});
  };
  
  function collectValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {
      email: email.input.value,
      password: password.input.value,
      confirmPassword: confirmPassword.input.value,
    };
    if (firstName) values.firstName = firstName.input.value;
    if (lastName) values.lastName = lastName.input.value;
    if (phone) values.phone = phone.input.value;
    if (profileTypeSelect) values.profileType = profileTypeSelect.value;
    if (termsCheckbox && fields.legalConsent.required) values.termsAccepted = termsCheckbox.checked;
    return values;
  }

  email.input.addEventListener('blur', () => {
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
    emailError.setText(extractFieldError(result, 'email'));
  });
  email.input.addEventListener('input', () => emailError.setText(null));
  password.input.addEventListener('blur', () => {
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
    passwordError.setText(extractFieldError(result, 'password'));
  });
  password.input.addEventListener('input', () => passwordError.setText(null));
  confirmPassword.input.addEventListener('blur', () => {
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
    confirmPasswordError.setText(extractFieldError(result, 'confirmPassword'));
  });
  confirmPassword.input.addEventListener('input', () => confirmPasswordError.setText(null));

  form.addEventListener('submit', handleSubmit);

  return () => {
    form.removeEventListener('submit', handleSubmit);
    unsubscribe();
    unmountTurnstile?.();
    form.remove();
  };
}
