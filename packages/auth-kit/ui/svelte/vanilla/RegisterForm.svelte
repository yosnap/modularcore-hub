<script lang="ts">
  import '../../vanilla-styles.css';
  import { resolveFieldConfig } from '../../../core/field-config.js';
  import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
  import { EYE_OFF_PATH, EYE_PATH } from '../icons.js';
  import TurnstileWidget from '../TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { AuthKitFieldConfig } from '../../../core/field-config.js';
  import type { PasswordPolicy } from '../../../core/validation.js';

  let {
    authKit,
    fieldConfig,
    passwordPolicy,
    onNavigateToLogin,
  }: {
    authKit: AuthKitRune;
    fieldConfig?: AuthKitFieldConfig;
    passwordPolicy?: PasswordPolicy;
    onNavigateToLogin?: () => void;
  } = $props();

  const fields = $derived(resolveFieldConfig(fieldConfig));

  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let phone = $state('');
  let profileType = $state(fields.profileType.defaultValue);
  let termsAccepted = $state(false);
  let showPassword = $state(false);
  let showConfirm = $state(false);
  let turnstileToken: string | null = $state(null);
  let fieldErrors: Record<string, string> = $state({});

  
  function collectValues(): Record<string, unknown> {
    const values: Record<string, unknown> = { email, password, confirmPassword };
    if (fields.firstName.enabled) values.firstName = firstName;
    if (fields.lastName.enabled) values.lastName = lastName;
    if (fields.phone.enabled) values.phone = phone;
    if (fields.profileType.enabled) values.profileType = profileType;
    if (fields.legalConsent.enabled && fields.legalConsent.required) values.termsAccepted = termsAccepted;
    return values;
  }

  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  function clearError(key: string): void {
    if (key in fieldErrors) {
      const { [key]: _removed, ...rest } = fieldErrors;
      fieldErrors = rest;
    }
  }

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  function validateField(key: string): void {
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
    const message = extractFieldError(result, key);
    if (message) {
      fieldErrors = { ...fieldErrors, [key]: message };
    } else {
      clearError(key);
    }
  }

  const flow = $derived(authKit.state.register);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const values: Record<string, unknown> = { email, password, confirmPassword };
    if (fields.firstName.enabled) values.firstName = firstName;
    if (fields.lastName.enabled) values.lastName = lastName;
    if (fields.phone.enabled) values.phone = phone;
    if (fields.profileType.enabled) values.profileType = profileType;
    if (fields.legalConsent.enabled && fields.legalConsent.required) values.termsAccepted = termsAccepted;

    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(values);
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit
      .register({
        email,
        password,
        firstName: fields.firstName.enabled ? firstName : undefined,
        lastName: fields.lastName.enabled ? lastName : undefined,
        phone: fields.phone.enabled ? phone : undefined,
        profileType: fields.profileType.enabled ? profileType : undefined,
        termsAccepted: fields.legalConsent.enabled ? termsAccepted : undefined,
        turnstileToken,
      })
      .catch(() => {});
  }
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<form onsubmit={handleSubmit} novalidate class="auth-kit-form">
  <label class="auth-kit-field" for="auth-kit-register-email">
    Correo electrónico
    <input id="auth-kit-register-email" type="email" bind:value={email} oninput={() => clearError('email')} onblur={() => validateField('email')} autocomplete="email" class="auth-kit-input" />
  </label>
  {#if fieldErrors.email}<p class="auth-kit-error">{fieldErrors.email}</p>{/if}

  {#if fields.firstName.enabled}
    <label class="auth-kit-field" for="auth-kit-register-firstname">
      {fields.firstName.label}
      <input id="auth-kit-register-firstname" type="text" bind:value={firstName} oninput={() => clearError('firstName')} onblur={() => validateField('firstName')} class="auth-kit-input" />
    </label>
  {/if}
  {#if fieldErrors.firstName}<p class="auth-kit-error">{fieldErrors.firstName}</p>{/if}

  {#if fields.lastName.enabled}
    <label class="auth-kit-field" for="auth-kit-register-lastname">
      {fields.lastName.label}
      <input id="auth-kit-register-lastname" type="text" bind:value={lastName} oninput={() => clearError('lastName')} onblur={() => validateField('lastName')} class="auth-kit-input" />
    </label>
  {/if}
  {#if fieldErrors.lastName}<p class="auth-kit-error">{fieldErrors.lastName}</p>{/if}

  {#if fields.phone.enabled}
    <label class="auth-kit-field" for="auth-kit-register-phone">
      {fields.phone.label}
      <input id="auth-kit-register-phone" type="tel" bind:value={phone} oninput={() => clearError('phone')} onblur={() => validateField('phone')} class="auth-kit-input" />
    </label>
  {/if}
  {#if fieldErrors.phone}<p class="auth-kit-error">{fieldErrors.phone}</p>{/if}

  {#if fields.profileType.enabled}
    <label class="auth-kit-field" for="auth-kit-register-profile-type">
      {fields.profileType.label}
      <select id="auth-kit-register-profile-type" bind:value={profileType} class="auth-kit-select">
        {#each fields.profileType.options as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>
  {/if}

  <div class="auth-kit-field">
    <label for="auth-kit-register-password">Contraseña</label>
    <div class="auth-kit-field__control">
      <input
        id="auth-kit-register-password"
        type={showPassword ? 'text' : 'password'}
        bind:value={password} oninput={() => clearError('password')} onblur={() => validateField('password')}
        autocomplete="new-password"
        class="auth-kit-input"
      />
      <button type="button" onclick={() => (showPassword = !showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} class="auth-kit-eye-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.password}<p class="auth-kit-error">{fieldErrors.password}</p>{/if}

  <div class="auth-kit-field">
    <label for="auth-kit-register-confirm-password">Confirmar contraseña</label>
    <div class="auth-kit-field__control">
      <input
        id="auth-kit-register-confirm-password"
        type={showConfirm ? 'text' : 'password'}
        bind:value={confirmPassword} oninput={() => clearError('confirmPassword')} onblur={() => validateField('confirmPassword')}
        autocomplete="new-password"
        class="auth-kit-input"
      />
      <button type="button" onclick={() => (showConfirm = !showConfirm)} aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'} class="auth-kit-eye-button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {@html showConfirm ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.confirmPassword}<p class="auth-kit-error">{fieldErrors.confirmPassword}</p>{/if}

  {#if fields.legalConsent.enabled}
    <div>
      <label class="auth-kit-checkbox-row" for="auth-kit-register-terms">
        <input id="auth-kit-register-terms" type="checkbox" bind:checked={termsAccepted} onchange={() => clearError('termsAccepted')} />
        <span>
          {fields.legalConsent.text}
          {#each fields.legalConsent.links as link, index (link.href)}
            {index > 0 ? ' ' : ''}<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
          {/each}
        </span>
      </label>
      {#if fieldErrors.termsAccepted}<p class="auth-kit-error">{fieldErrors.termsAccepted}</p>{/if}
    </div>
  {/if}

  {#if fields.turnstile.enabled}
    <TurnstileWidget
      siteKey={fields.turnstile.siteKey}
      theme={fields.turnstile.theme}
      mode={fields.turnstile.mode}
      onToken={(t) => (turnstileToken = t)}
    />
  {/if}

  <button type="submit" disabled={flow.status === 'submitting'} class="auth-kit-button auth-kit-button--primary">
    {flow.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class="auth-kit-error">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="auth-kit-success">Cuenta creada.</p>{/if}

  {#if onNavigateToLogin}
    <p class="auth-kit-status">
      ¿Ya tienes una cuenta? <button type="button" onclick={onNavigateToLogin} class="auth-kit-button auth-kit-button--ghost">Iniciar sesión</button>
    </p>
  {/if}
</form>
