<script lang="ts">
  import { resolveFieldConfig } from '../../core/field-config.js';
  import { buildRegisterSchema, extractFieldError } from '../../core/validation.js';
  import TurnstileWidget from './TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../adapters/svelte/create-auth-kit.svelte.js';
  import type { AuthKitFieldConfig } from '../../core/field-config.js';
  import type { PasswordPolicy } from '../../core/validation.js';

  let {
    authKit,
    fieldConfig,
    passwordPolicy,
  }: { authKit: AuthKitRune; fieldConfig?: AuthKitFieldConfig; passwordPolicy?: PasswordPolicy } = $props();

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<form onsubmit={handleSubmit} novalidate>
  <div>
    <label for="auth-kit-register-email">Correo electrónico</label>
    <input id="auth-kit-register-email" type="email" bind:value={email} oninput={() => clearError('email')} onblur={() => validateField('email')} autocomplete="email" />
    {#if fieldErrors.email}<p role="alert">{fieldErrors.email}</p>{/if}
  </div>

  {#if fields.firstName.enabled}
    <div>
      <label for="auth-kit-register-firstname">{fields.firstName.label}</label>
      <input id="auth-kit-register-firstname" type="text" bind:value={firstName} oninput={() => clearError('firstName')} onblur={() => validateField('firstName')} />
      {#if fieldErrors.firstName}<p role="alert">{fieldErrors.firstName}</p>{/if}
    </div>
  {/if}

  {#if fields.lastName.enabled}
    <div>
      <label for="auth-kit-register-lastname">{fields.lastName.label}</label>
      <input id="auth-kit-register-lastname" type="text" bind:value={lastName} oninput={() => clearError('lastName')} onblur={() => validateField('lastName')} />
      {#if fieldErrors.lastName}<p role="alert">{fieldErrors.lastName}</p>{/if}
    </div>
  {/if}

  {#if fields.phone.enabled}
    <div>
      <label for="auth-kit-register-phone">{fields.phone.label}</label>
      <input id="auth-kit-register-phone" type="tel" bind:value={phone} oninput={() => clearError('phone')} onblur={() => validateField('phone')} />
      {#if fieldErrors.phone}<p role="alert">{fieldErrors.phone}</p>{/if}
    </div>
  {/if}

  {#if fields.profileType.enabled}
    <div>
      <label for="auth-kit-register-profile-type">{fields.profileType.label}</label>
      <select id="auth-kit-register-profile-type" bind:value={profileType}>
        {#each fields.profileType.options as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div>
    <label for="auth-kit-register-password">Contraseña</label>
    <input
      id="auth-kit-register-password"
      type={showPassword ? 'text' : 'password'}
      bind:value={password} oninput={() => clearError('password')} onblur={() => validateField('password')}
      autocomplete="new-password"
    />
    <button type="button" onclick={() => (showPassword = !showPassword)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
    {#if fieldErrors.password}<p role="alert">{fieldErrors.password}</p>{/if}
  </div>

  <div>
    <label for="auth-kit-register-confirm-password">Confirmar contraseña</label>
    <input
      id="auth-kit-register-confirm-password"
      type={showConfirm ? 'text' : 'password'}
      bind:value={confirmPassword} oninput={() => clearError('confirmPassword')} onblur={() => validateField('confirmPassword')}
      autocomplete="new-password"
    />
    <button type="button" onclick={() => (showConfirm = !showConfirm)}>{showConfirm ? 'Ocultar' : 'Mostrar'}</button>
    {#if fieldErrors.confirmPassword}<p role="alert">{fieldErrors.confirmPassword}</p>{/if}
  </div>

  {#if fields.legalConsent.enabled}
    <div>
      <label for="auth-kit-register-terms">
        <input id="auth-kit-register-terms" type="checkbox" bind:checked={termsAccepted} onchange={() => clearError('termsAccepted')} />
        {fields.legalConsent.text}
        {#each fields.legalConsent.links as link, index (link.href)}
          {index > 0 ? ' ' : ''}<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
        {/each}
      </label>
      {#if fieldErrors.termsAccepted}<p role="alert">{fieldErrors.termsAccepted}</p>{/if}
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

  <button type="submit" disabled={flow.status === 'submitting'}>
    {flow.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta'}
  </button>
  {#if flow.status === 'error' && flow.error}<p role="alert">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p>Cuenta creada.</p>{/if}
</form>
