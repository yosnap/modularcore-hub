<script lang="ts">
  import '../../shadcn-theme.css';
  import { resolveFieldConfig } from '../../../core/field-config.js';
  import { evaluatePasswordStrength } from '../../../core/password-strength.js';
  import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
  import { CHECK_PATH, EYE_OFF_PATH, EYE_PATH } from '../icons.js';
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

  const inputClass =
    'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelClass = 'text-sm font-medium leading-none';
  const errorClass = 'text-sm text-destructive';
  const linkClass = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

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

  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  function clearError(key: string): void {
    if (key in fieldErrors) {
      const { [key]: _removed, ...rest } = fieldErrors;
      fieldErrors = rest;
    }
  }

  function collectValues(): Record<string, unknown> {
    const values: Record<string, unknown> = { email, password, confirmPassword };
    if (fields.firstName.enabled) values.firstName = firstName;
    if (fields.lastName.enabled) values.lastName = lastName;
    if (fields.phone.enabled) values.phone = phone;
    if (fields.profileType.enabled) values.profileType = profileType;
    if (fields.legalConsent.enabled && fields.legalConsent.required) values.termsAccepted = termsAccepted;
    return values;
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
  const strength = $derived(evaluatePasswordStrength(password, passwordPolicy));

  function strengthBarClass(index: number): string {
    if (index >= strength.score) return 'bg-muted';
    if (strength.score === strength.total) return 'bg-green-500';
    if (strength.score >= strength.total - 1) return 'bg-yellow-500';
    return 'bg-destructive';
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<form onsubmit={handleSubmit} novalidate class="flex flex-col gap-4">
  {#if fields.profileType.enabled}
    <div class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="tablist" aria-label={fields.profileType.label}>
      {#each fields.profileType.options as option (option.value)}
        <button
          type="button"
          role="tab"
          aria-selected={profileType === option.value}
          onclick={() => (profileType = option.value)}
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors {profileType === option.value
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'}"
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-register-email">Email</label>
    <input id="auth-kit-register-email" type="email" bind:value={email} oninput={() => clearError('email')} onblur={() => validateField('email')} autocomplete="email" class={inputClass} />
    {#if fieldErrors.email}<p class={errorClass}>{fieldErrors.email}</p>{/if}
  </div>

  {#if fields.firstName.enabled}
    <div class="flex flex-col gap-1.5">
      <label class={labelClass} for="auth-kit-register-firstname">{fields.firstName.label}</label>
      <input id="auth-kit-register-firstname" type="text" bind:value={firstName} oninput={() => clearError('firstName')} onblur={() => validateField('firstName')} class={inputClass} />
      {#if fieldErrors.firstName}<p class={errorClass}>{fieldErrors.firstName}</p>{/if}
    </div>
  {/if}

  {#if fields.lastName.enabled}
    <div class="flex flex-col gap-1.5">
      <label class={labelClass} for="auth-kit-register-lastname">{fields.lastName.label}</label>
      <input id="auth-kit-register-lastname" type="text" bind:value={lastName} oninput={() => clearError('lastName')} onblur={() => validateField('lastName')} class={inputClass} />
      {#if fieldErrors.lastName}<p class={errorClass}>{fieldErrors.lastName}</p>{/if}
    </div>
  {/if}

  {#if fields.phone.enabled}
    <div class="flex flex-col gap-1.5">
      <label class={labelClass} for="auth-kit-register-phone">{fields.phone.label}</label>
      <input id="auth-kit-register-phone" type="tel" bind:value={phone} oninput={() => clearError('phone')} onblur={() => validateField('phone')} class={inputClass} />
      {#if fieldErrors.phone}<p class={errorClass}>{fieldErrors.phone}</p>{/if}
    </div>
  {/if}

  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-register-password">Password</label>
    <div class="relative">
      <input
        id="auth-kit-register-password"
        type={showPassword ? 'text' : 'password'}
        bind:value={password}
        oninput={() => clearError('password')}
        onblur={() => validateField('password')}
        autocomplete="new-password"
        class="{inputClass} pr-9"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
    {#if password.length > 0}
      <div class="flex flex-col gap-1.5">
        <div class="flex gap-1">
          {#each Array.from({ length: strength.total }) as _, index (index)}
            <span class="h-1 flex-1 rounded-full {strengthBarClass(index)}"></span>
          {/each}
        </div>
        <ul class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          {#each strength.requirements as requirement (requirement.key)}
            <li class="flex items-center gap-1 {requirement.met ? 'text-green-600' : 'text-muted-foreground'}">
              {#if requirement.met}
                <svg viewBox="0 0 11 11" class="h-3 w-3">{@html CHECK_PATH}</svg>
              {:else}
                <span class="inline-block h-3 w-3" aria-hidden="true">·</span>
              {/if}
              {requirement.label}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if fieldErrors.password}<p class={errorClass}>{fieldErrors.password}</p>{/if}
  </div>

  <div class="flex flex-col gap-1.5">
    <label class={labelClass} for="auth-kit-register-confirm-password">Confirm password</label>
    <div class="relative">
      <input
        id="auth-kit-register-confirm-password"
        type={showConfirm ? 'text' : 'password'}
        bind:value={confirmPassword}
        oninput={() => clearError('confirmPassword')}
        onblur={() => validateField('confirmPassword')}
        autocomplete="new-password"
        class="{inputClass} pr-9"
      />
      <button
        type="button"
        onclick={() => (showConfirm = !showConfirm)}
        aria-label={showConfirm ? 'Hide password' : 'Show password'}
        class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          {@html showConfirm ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
    {#if fieldErrors.confirmPassword}<p class={errorClass}>{fieldErrors.confirmPassword}</p>{/if}
  </div>

  {#if fields.legalConsent.enabled}
    <div>
      <div class="flex items-start gap-2">
        <input
          id="auth-kit-register-terms"
          type="checkbox"
          bind:checked={termsAccepted}
          onchange={() => clearError('termsAccepted')}
          class="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-primary"
        />
        <label for="auth-kit-register-terms" class="text-sm text-muted-foreground">
          {fields.legalConsent.text}
          {#each fields.legalConsent.links as link, index (link.href)}
            {index > 0 ? ' ' : ''}<a href={link.href} target="_blank" rel="noreferrer" class="font-medium text-foreground hover:underline">{link.label}</a>
          {/each}
        </label>
      </div>
      {#if fieldErrors.termsAccepted}<p class={errorClass}>{fieldErrors.termsAccepted}</p>{/if}
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

  <button
    type="submit"
    disabled={flow.status === 'submitting'}
    class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
  >
    {flow.status === 'submitting' ? 'Creating account…' : 'Create account'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class={errorClass}>{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="text-sm text-green-600">Account created.</p>{/if}

  {#if onNavigateToLogin}
    <p class="text-center text-sm text-muted-foreground">
      Already have an account? <button type="button" onclick={onNavigateToLogin} class={linkClass}>Sign in</button>
    </p>
  {/if}
</form>
