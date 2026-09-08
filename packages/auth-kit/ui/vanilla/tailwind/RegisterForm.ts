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

const INPUT_CLASS =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const ERROR_CLASS = 'text-sm text-red-600 dark:text-red-400';
const EYE_BUTTON_CLASS =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

/** Tailwind variant — same options/behavior as headless, styled with the media-picker zinc palette. */
export function mountRegisterForm(
  container: HTMLElement,
  { authKit, fieldConfig, passwordPolicy, onNavigateToLogin }: MountRegisterFormOptions,
): () => void {
  const fields = resolveFieldConfig(fieldConfig);

  const email = field(
    'Correo electrónico',
    { id: 'auth-kit-register-email', type: 'email', autocomplete: 'email' },
    { label: LABEL_CLASS, input: INPUT_CLASS },
  );
  const emailError = errorText(ERROR_CLASS);
  const password = field(
    'Contraseña',
    { id: 'auth-kit-register-password', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const passwordError = errorText(ERROR_CLASS);
  const showPassword = el('button', {
    type: 'button',
    'aria-label': 'Mostrar contraseña',
    class: EYE_BUTTON_CLASS,
  });
  showPassword.innerHTML = eyeSvg(true);
  const passwordWrapper = el('div', { class: 'relative' }, [password.input, showPassword]);

  const confirmPassword = field(
    'Confirmar contraseña',
    { id: 'auth-kit-register-confirm-password', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const confirmPasswordError = errorText(ERROR_CLASS);
  const showConfirm = el('button', {
    type: 'button',
    'aria-label': 'Mostrar contraseña',
    class: EYE_BUTTON_CLASS,
  });
  showConfirm.innerHTML = eyeSvg(true);
  const confirmPasswordWrapper = el('div', { class: 'relative' }, [
    confirmPassword.input,
    showConfirm,
  ]);

  const submit = el(
    'button',
    {
      type: 'submit',
      class:
        'rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300',
    },
    ['Crear cuenta'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600 dark:text-green-400' });
  success.hidden = true;

  const rows: HTMLElement[] = [email.label, emailError.node];

  let firstName: ReturnType<typeof field> | undefined;
  if (fields.firstName.enabled) {
    firstName = field(
      fields.firstName.label,
      { id: 'auth-kit-register-firstname', type: 'text' },
      { label: LABEL_CLASS, input: INPUT_CLASS },
    );
    rows.push(firstName.label);
  }
  let lastName: ReturnType<typeof field> | undefined;
  if (fields.lastName.enabled) {
    lastName = field(
      fields.lastName.label,
      { id: 'auth-kit-register-lastname', type: 'text' },
      { label: LABEL_CLASS, input: INPUT_CLASS },
    );
    rows.push(lastName.label);
  }
  let phone: ReturnType<typeof field> | undefined;
  if (fields.phone.enabled) {
    phone = field(
      fields.phone.label,
      { id: 'auth-kit-register-phone', type: 'tel' },
      { label: LABEL_CLASS, input: INPUT_CLASS },
    );
    rows.push(phone.label);
  }
  let profileTypeSelect: HTMLSelectElement | undefined;
  if (fields.profileType.enabled) {
    profileTypeSelect = el(
      'select',
      { id: 'auth-kit-register-profile-type', class: `${INPUT_CLASS} dark:[color-scheme:dark]` },
      fields.profileType.options.map((option) =>
        el('option', { value: option.value }, [option.label]),
      ),
    );
    profileTypeSelect.value = fields.profileType.defaultValue;
    rows.push(
      el('label', { for: 'auth-kit-register-profile-type', class: LABEL_CLASS }, [
        fields.profileType.label,
        profileTypeSelect,
      ]),
    );
  }

  rows.push(password.label, passwordWrapper, passwordError.node);
  rows.push(confirmPassword.label, confirmPasswordWrapper, confirmPasswordError.node);

  let termsCheckbox: HTMLInputElement | undefined;
  const termsError = errorText(ERROR_CLASS);
  if (fields.legalConsent.enabled) {
    termsCheckbox = el('input', {
      id: 'auth-kit-register-terms',
      type: 'checkbox',
      class: 'mt-0.5',
    });
    const links = fields.legalConsent.links.map((link, index) => {
      const anchor = el(
        'a',
        {
          href: link.href,
          target: '_blank',
          rel: 'noreferrer',
          class: 'font-medium text-zinc-900 hover:underline dark:text-zinc-100',
        },
        [link.label],
      );
      return index > 0 ? el('span', {}, [' ', anchor]) : anchor;
    });
    const label = el(
      'label',
      {
        for: 'auth-kit-register-terms',
        class: 'flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300',
      },
      [termsCheckbox, fields.legalConsent.text, ' ', ...links],
    );
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

  let loginFooter: HTMLParagraphElement | undefined;
  let loginLink: HTMLButtonElement | undefined;
  if (onNavigateToLogin) {
    loginLink = el(
      'button',
      {
        type: 'button',
        class:
          'appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300',
      },
      ['Iniciar sesión'],
    );
    loginFooter = el('p', { class: 'text-center text-sm text-zinc-600 dark:text-zinc-400' }, [
      '¿Ya tienes una cuenta? ',
      loginLink,
    ]);
    rows.push(loginFooter);
  }

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-3' }, rows);
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
      const issues = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
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
