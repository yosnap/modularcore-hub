import { resolveFieldConfig } from '../../../core/field-config.js';
import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import { mountTurnstileWidget, TurnstileController } from '../../../core/turnstile.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
import { checkSvg, eyeSvg } from '../icons.js';
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
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LABEL_CLASS = 'text-sm font-medium leading-none';
const ERROR_CLASS = 'text-sm text-destructive';
const LINK_CLASS = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

function strengthBarClass(index: number, score: number, total: number): string {
  if (index >= score) return 'bg-muted';
  if (score === total) return 'bg-green-500';
  if (score >= total - 1) return 'bg-yellow-500';
  return 'bg-destructive';
}

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same options/behavior as headless. */
export function mountRegisterForm(
  container: HTMLElement,
  { authKit, fieldConfig, passwordPolicy, onNavigateToLogin }: MountRegisterFormOptions,
): () => void {
  const fields = resolveFieldConfig(fieldConfig);

  const email = field('Correo electrónico', { id: 'auth-kit-register-email', type: 'email', autocomplete: 'email' }, { label: LABEL_CLASS, input: INPUT_CLASS });
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
    class: 'absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground',
  });
  showPassword.innerHTML = eyeSvg(true);
  const passwordWrapper = el('div', { class: 'relative' }, [password.input, showPassword]);
  const strengthBars = el('div', { class: 'flex gap-1' });
  const strengthList = el('ul', { class: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs' });
  const strengthBlock = el('div', { class: 'flex flex-col gap-1.5' }, [strengthBars, strengthList]);
  strengthBlock.hidden = true;

  const confirmPassword = field(
    'Confirmar contraseña',
    { id: 'auth-kit-register-confirm-password', type: 'password', autocomplete: 'new-password' },
    { label: LABEL_CLASS, input: `${INPUT_CLASS} pr-9` },
  );
  const confirmPasswordError = errorText(ERROR_CLASS);
  const showConfirm = el('button', {
    type: 'button',
    'aria-label': 'Mostrar contraseña',
    class: 'absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground',
  });
  showConfirm.innerHTML = eyeSvg(true);
  const confirmPasswordWrapper = el('div', { class: 'relative' }, [confirmPassword.input, showConfirm]);

  const submit = el(
    'button',
    {
      type: 'submit',
      class: 'inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50',
    },
    ['Crear cuenta'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600' });
  success.hidden = true;

  const rows: HTMLElement[] = [];

  let profileType = fields.profileType.defaultValue;
  const profileTypeButtons: HTMLButtonElement[] = [];
  function renderProfileTypeTabs(): void {
    for (const button of profileTypeButtons) {
      const active = button.dataset.value === profileType;
      button.className = `rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
      }`;
      button.setAttribute('aria-selected', String(active));
    }
  }
  if (fields.profileType.enabled) {
    const tablist = el('div', { class: 'grid grid-cols-2 gap-1 rounded-md bg-muted p-1', role: 'tablist', 'aria-label': fields.profileType.label });
    for (const option of fields.profileType.options) {
      const button = el('button', { type: 'button', role: 'tab', 'data-value': option.value }, [option.label]);
      button.addEventListener('click', () => {
        profileType = option.value;
        renderProfileTypeTabs();
      });
      profileTypeButtons.push(button);
      tablist.append(button);
    }
    renderProfileTypeTabs();
    rows.push(tablist);
  }

  rows.push(el('div', { class: 'flex flex-col gap-1.5' }, [email.label, emailError.node]));

  let firstName: ReturnType<typeof field> | undefined;
  if (fields.firstName.enabled) {
    firstName = field(fields.firstName.label, { id: 'auth-kit-register-firstname', type: 'text' }, { label: LABEL_CLASS, input: INPUT_CLASS });
    rows.push(el('div', { class: 'flex flex-col gap-1.5' }, [firstName.label]));
  }
  let lastName: ReturnType<typeof field> | undefined;
  if (fields.lastName.enabled) {
    lastName = field(fields.lastName.label, { id: 'auth-kit-register-lastname', type: 'text' }, { label: LABEL_CLASS, input: INPUT_CLASS });
    rows.push(el('div', { class: 'flex flex-col gap-1.5' }, [lastName.label]));
  }
  let phone: ReturnType<typeof field> | undefined;
  if (fields.phone.enabled) {
    phone = field(fields.phone.label, { id: 'auth-kit-register-phone', type: 'tel' }, { label: LABEL_CLASS, input: INPUT_CLASS });
    rows.push(el('div', { class: 'flex flex-col gap-1.5' }, [phone.label]));
  }

  rows.push(
    el('div', { class: 'flex flex-col gap-1.5' }, [password.label, passwordWrapper, strengthBlock, passwordError.node]),
  );
  rows.push(el('div', { class: 'flex flex-col gap-1.5' }, [confirmPassword.label, confirmPasswordWrapper, confirmPasswordError.node]));

  let termsCheckbox: HTMLInputElement | undefined;
  const termsError = errorText(ERROR_CLASS);
  if (fields.legalConsent.enabled) {
    termsCheckbox = el('input', {
      id: 'auth-kit-register-terms',
      type: 'checkbox',
      class: 'mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-primary',
    });
    const links = fields.legalConsent.links.map((link, index) => {
      const anchor = el('a', { href: link.href, target: '_blank', rel: 'noreferrer', class: 'font-medium text-foreground hover:underline' }, [
        link.label,
      ]);
      return index > 0 ? el('span', {}, [' ', anchor]) : anchor;
    });
    const label = el('label', { for: 'auth-kit-register-terms', class: 'text-sm text-muted-foreground' }, [fields.legalConsent.text, ' ', ...links]);
    rows.push(el('div', {}, [el('div', { class: 'flex items-start gap-2' }, [termsCheckbox, label]), termsError.node]));
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
    loginLink = el('button', { type: 'button', class: LINK_CLASS }, ['Iniciar sesión']);
    loginFooter = el('p', { class: 'text-center text-sm text-muted-foreground' }, ['¿Ya tienes una cuenta? ', loginLink]);
    rows.push(loginFooter);
  }

  const form = el('form', { novalidate: '', class: 'flex flex-col gap-4' }, rows);
  container.append(form);

  function updateStrength(): void {
    const value = password.input.value;
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
  password.input.addEventListener('input', updateStrength);

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
    if (fields.profileType.enabled) values.profileType = profileType;
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
        profileType: fields.profileType.enabled ? profileType : undefined,
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
    if (fields.profileType.enabled) values.profileType = profileType;
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
    password.input.removeEventListener('input', updateStrength);
    unsubscribe();
    unmountTurnstile?.();
    form.remove();
  };
}
