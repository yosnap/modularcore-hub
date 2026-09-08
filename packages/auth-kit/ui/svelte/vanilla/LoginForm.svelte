<script lang="ts">
  import '../../vanilla-styles.css';
  import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
  import { EYE_OFF_PATH, EYE_PATH } from '../icons.js';
  import TurnstileWidget from '../TurnstileWidget.svelte';

  import type { AuthKitRune } from '../../../adapters/svelte/create-auth-kit.svelte.js';
  import type { TurnstileFieldConfig } from '../../../core/field-config.js';

  let {
    authKit,
    turnstile,
    onNavigateToRegister,
    onNavigateToForgotPassword,
  }: {
    authKit: AuthKitRune;
    turnstile?: TurnstileFieldConfig;
    onNavigateToRegister?: () => void;
    onNavigateToForgotPassword?: () => void;
  } = $props();

  let identifier = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let turnstileToken: string | null = $state(null);
  let fieldErrors: Record<string, string> = $state({});

  
  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  function clearError(key: string): void {
    if (key in fieldErrors) {
      const { [key]: _removed, ...rest } = fieldErrors;
      fieldErrors = rest;
    }
  }

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  function validateField(key: string): void {
    const result = buildLoginSchema().safeParse({ identifier, password });
    const message = extractFieldError(result, key);
    if (message) {
      fieldErrors = { ...fieldErrors, [key]: message };
    } else {
      clearError(key);
    }
  }

  const flow = $derived(authKit.state.login);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const result = buildLoginSchema().safeParse({ identifier, password });
    if (!result.success) {
      fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    fieldErrors = {};
    void authKit.login({ identifier, password, turnstileToken }).catch(() => {});
  }
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<form onsubmit={handleSubmit} novalidate class="auth-kit-form">
  <label class="auth-kit-field" for="auth-kit-login-identifier">
    Correo electrónico o nombre de usuario
    <input id="auth-kit-login-identifier" type="text" bind:value={identifier} oninput={() => clearError('identifier')} onblur={() => validateField('identifier')} autocomplete="username" class="auth-kit-input" />
  </label>
  {#if fieldErrors.identifier}<p class="auth-kit-error">{fieldErrors.identifier}</p>{/if}

  <div class="auth-kit-field">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <label for="auth-kit-login-password">Contraseña</label>
      {#if onNavigateToForgotPassword}
        <button type="button" onclick={onNavigateToForgotPassword} class="auth-kit-button auth-kit-button--ghost">¿Olvidaste tu contraseña?</button>
      {/if}
    </div>
    <div class="auth-kit-field__control">
      <input
        id="auth-kit-login-password"
        type={showPassword ? 'text' : 'password'}
        bind:value={password} oninput={() => clearError('password')} onblur={() => validateField('password')}
        autocomplete="current-password"
        class="auth-kit-input"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        class="auth-kit-eye-button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {@html showPassword ? EYE_OFF_PATH : EYE_PATH}
        </svg>
      </button>
    </div>
  </div>
  {#if fieldErrors.password}<p class="auth-kit-error">{fieldErrors.password}</p>{/if}

  {#if turnstile?.enabled}
    <TurnstileWidget siteKey={turnstile.siteKey} theme={turnstile.theme} mode={turnstile.mode} onToken={(t) => (turnstileToken = t)} />
  {/if}

  <button type="submit" disabled={flow.status === 'submitting'} class="auth-kit-button auth-kit-button--primary">
    {flow.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión'}
  </button>
  {#if flow.status === 'error' && flow.error}<p class="auth-kit-error">{flow.error.message}</p>{/if}
  {#if flow.status === 'success'}<p class="auth-kit-success">Sesión iniciada.</p>{/if}

  {#if onNavigateToRegister}
    <p class="auth-kit-status">
      ¿Aún no tienes una cuenta? <button type="button" onclick={onNavigateToRegister} class="auth-kit-button auth-kit-button--ghost">Registrarse</button>
    </p>
  {/if}
</form>
