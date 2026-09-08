import { resolveFieldConfig } from '../../core/field-config.js';
import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';
import { buildRegisterSchema, extractFieldError } from '../../core/validation.js';
import { el, errorText, field } from './internal/dom.js';

import type { AuthKitStore } from '../../adapters/vanilla/create-auth-kit-store.js';
import type { AuthKitFieldConfig } from '../../core/field-config.js';
import type { PasswordPolicy } from '../../core/validation.js';

export interface MountRegisterFormOptions {
  authKit: AuthKitStore;
  fieldConfig?: AuthKitFieldConfig;
  passwordPolicy?: PasswordPolicy;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same options/behavior across every presentation. */
export function mountRegisterForm(container: HTMLElement, { authKit, fieldConfig, passwordPolicy }: MountRegisterFormOptions): () => void {
  const fields = resolveFieldConfig(fieldConfig);

  const email = field('Correo electrónico', { id: 'auth-kit-register-email', type: 'email', autocomplete: 'email' });
  const emailError = errorText();
  const password = field('Contraseña', { id: 'auth-kit-register-password', type: 'password', autocomplete: 'new-password' });
  const passwordError = errorText();
  const showPassword = el('button', { type: 'button' }, ['Mostrar']);
  const confirmPassword = field('Confirmar contraseña', { id: 'auth-kit-register-confirm-password', type: 'password', autocomplete: 'new-password' });
  const confirmPasswordError = errorText();
  const showConfirm = el('button', { type: 'button' }, ['Mostrar']);
  const submit = el('button', { type: 'submit' }, ['Crear cuenta']);
  const submitError = errorText();
  const success = el('p');
  success.hidden = true;

  const rows: HTMLElement[] = [el('div', {}, [email.label, emailError.node])];

  let firstName: ReturnType<typeof field> | undefined;
  if (fields.firstName.enabled) {
    firstName = field(fields.firstName.label, { id: 'auth-kit-register-firstname', type: 'text' });
    rows.push(el('div', {}, [firstName.label]));
  }
  let lastName: ReturnType<typeof field> | undefined;
  if (fields.lastName.enabled) {
    lastName = field(fields.lastName.label, { id: 'auth-kit-register-lastname', type: 'text' });
    rows.push(el('div', {}, [lastName.label]));
  }
  let phone: ReturnType<typeof field> | undefined;
  if (fields.phone.enabled) {
    phone = field(fields.phone.label, { id: 'auth-kit-register-phone', type: 'tel' });
    rows.push(el('div', {}, [phone.label]));
  }
  let profileTypeSelect: HTMLSelectElement | undefined;
  if (fields.profileType.enabled) {
    profileTypeSelect = el(
      'select',
      { id: 'auth-kit-register-profile-type' },
      fields.profileType.options.map((option) => el('option', { value: option.value }, [option.label])),
    );
    profileTypeSelect.value = fields.profileType.defaultValue;
    const label = el('label', { for: 'auth-kit-register-profile-type' }, [fields.profileType.label, profileTypeSelect]);
    rows.push(el('div', {}, [label]));
  }

  rows.push(el('div', {}, [el('div', {}, [password.label, showPassword]), passwordError.node]));
  rows.push(el('div', {}, [el('div', {}, [confirmPassword.label, showConfirm]), confirmPasswordError.node]));

  let termsCheckbox: HTMLInputElement | undefined;
  const termsError = errorText();
  if (fields.legalConsent.enabled) {
    termsCheckbox = el('input', { id: 'auth-kit-register-terms', type: 'checkbox' });
    const links = fields.legalConsent.links.map((link, index) => {
      const anchor = el('a', { href: link.href, target: '_blank', rel: 'noreferrer' }, [link.label]);
      return index > 0 ? el('span', {}, [' ', anchor]) : anchor;
    });
    const label = el('label', { for: 'auth-kit-register-terms' }, [termsCheckbox, fields.legalConsent.text, ' ', ...links]);
    rows.push(el('div', {}, [label, termsError.node]));
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
  const form = el('form', { novalidate: '' }, rows);
  container.append(form);

  showPassword.addEventListener('click', () => {
    const showing = password.input.type === 'text';
    password.input.type = showing ? 'password' : 'text';
    showPassword.textContent = showing ? 'Mostrar' : 'Ocultar';
  });
  showConfirm.addEventListener('click', () => {
    const showing = confirmPassword.input.type === 'text';
    confirmPassword.input.type = showing ? 'password' : 'text';
    showConfirm.textContent = showing ? 'Mostrar' : 'Ocultar';
  });

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
