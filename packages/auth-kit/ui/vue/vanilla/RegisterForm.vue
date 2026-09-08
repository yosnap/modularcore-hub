<script setup lang="ts">
import { computed, ref } from 'vue';

import '../../vanilla-styles.css';
import { resolveFieldConfig } from '../../../core/field-config.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { AuthKitFieldConfig } from '../../../core/field-config.js';
import type { PasswordPolicy } from '../../../core/validation.js';

const props = defineProps<{
  authKit: UseAuthKitResult;
  fieldConfig?: AuthKitFieldConfig;
  passwordPolicy?: PasswordPolicy;
  onNavigateToLogin?: () => void;
}>();

const fields = computed(() => resolveFieldConfig(props.fieldConfig));

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const firstName = ref('');
const lastName = ref('');
const phone = ref('');
const profileType = ref(fields.value.profileType.defaultValue);
const termsAccepted = ref(false);
const showPassword = ref(false);
const showConfirm = ref(false);
const turnstileToken = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});


function collectValues(): Record<string, unknown> {
  const f = fields.value;
  const values: Record<string, unknown> = { email: email.value, password: password.value, confirmPassword: confirmPassword.value };
  if (f.firstName.enabled) values.firstName = firstName.value;
  if (f.lastName.enabled) values.lastName = lastName.value;
  if (f.phone.enabled) values.phone = phone.value;
  if (f.profileType.enabled) values.profileType = profileType.value;
  if (f.legalConsent.enabled && f.legalConsent.required) values.termsAccepted = termsAccepted.value;
  return values;
}

/** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
function clearError(key: string): void {
  if (key in fieldErrors.value) {
    const next = { ...fieldErrors.value };
    delete next[key];
    fieldErrors.value = next;
  }
}

/** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
function validateField(key: string): void {
  const result = buildRegisterSchema(fields.value, { passwordPolicy: props.passwordPolicy }).safeParse(collectValues());
  const message = extractFieldError(result, key);
  if (message) {
    fieldErrors.value = { ...fieldErrors.value, [key]: message };
  } else {
    clearError(key);
  }
}

function handleSubmit(): void {
  const f = fields.value;
  const values: Record<string, unknown> = { email: email.value, password: password.value, confirmPassword: confirmPassword.value };
  if (f.firstName.enabled) values.firstName = firstName.value;
  if (f.lastName.enabled) values.lastName = lastName.value;
  if (f.phone.enabled) values.phone = phone.value;
  if (f.profileType.enabled) values.profileType = profileType.value;
  if (f.legalConsent.enabled && f.legalConsent.required) values.termsAccepted = termsAccepted.value;

  const result = buildRegisterSchema(f, { passwordPolicy: props.passwordPolicy }).safeParse(values);
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return;
  }
  fieldErrors.value = {};
  void props.authKit
    .register({
      email: email.value,
      password: password.value,
      firstName: f.firstName.enabled ? firstName.value : undefined,
      lastName: f.lastName.enabled ? lastName.value : undefined,
      phone: f.phone.enabled ? phone.value : undefined,
      profileType: f.profileType.enabled ? profileType.value : undefined,
      termsAccepted: f.legalConsent.enabled ? termsAccepted.value : undefined,
      turnstileToken: turnstileToken.value,
    })
    .catch(() => {});
}
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<template>
  <form novalidate class="auth-kit-form" @submit.prevent="handleSubmit">
    <label class="auth-kit-field" for="auth-kit-register-email">
      Email
      <input id="auth-kit-register-email" v-model="email" @input="clearError('email')" @blur="validateField('email')" type="email" autocomplete="email" class="auth-kit-input" />
    </label>
    <p v-if="fieldErrors.email" class="auth-kit-error">{{ fieldErrors.email }}</p>

    <label v-if="fields.firstName.enabled" class="auth-kit-field" for="auth-kit-register-firstname">
      {{ fields.firstName.label }}
      <input id="auth-kit-register-firstname" v-model="firstName" @input="clearError('firstName')" @blur="validateField('firstName')" type="text" class="auth-kit-input" />
    </label>
    <p v-if="fieldErrors.firstName" class="auth-kit-error">{{ fieldErrors.firstName }}</p>

    <label v-if="fields.lastName.enabled" class="auth-kit-field" for="auth-kit-register-lastname">
      {{ fields.lastName.label }}
      <input id="auth-kit-register-lastname" v-model="lastName" @input="clearError('lastName')" @blur="validateField('lastName')" type="text" class="auth-kit-input" />
    </label>
    <p v-if="fieldErrors.lastName" class="auth-kit-error">{{ fieldErrors.lastName }}</p>

    <label v-if="fields.phone.enabled" class="auth-kit-field" for="auth-kit-register-phone">
      {{ fields.phone.label }}
      <input id="auth-kit-register-phone" v-model="phone" @input="clearError('phone')" @blur="validateField('phone')" type="tel" class="auth-kit-input" />
    </label>
    <p v-if="fieldErrors.phone" class="auth-kit-error">{{ fieldErrors.phone }}</p>

    <label v-if="fields.profileType.enabled" class="auth-kit-field" for="auth-kit-register-profile-type">
      {{ fields.profileType.label }}
      <select id="auth-kit-register-profile-type" v-model="profileType" class="auth-kit-select">
        <option v-for="option in fields.profileType.options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>

    <div class="auth-kit-field">
      <label for="auth-kit-register-password">Password</label>
      <div class="auth-kit-field__control">
        <input
          id="auth-kit-register-password"
          v-model="password" @input="clearError('password')" @blur="validateField('password')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          class="auth-kit-input"
        />
        <button
          type="button"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          class="auth-kit-eye-button"
          @click="showPassword = !showPassword"
        >
          <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <path d="M1 1l22 22" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
    <p v-if="fieldErrors.password" class="auth-kit-error">{{ fieldErrors.password }}</p>

    <div class="auth-kit-field">
      <label for="auth-kit-register-confirm-password">Confirm password</label>
      <div class="auth-kit-field__control">
        <input
          id="auth-kit-register-confirm-password"
          v-model="confirmPassword" @input="clearError('confirmPassword')" @blur="validateField('confirmPassword')"
          :type="showConfirm ? 'text' : 'password'"
          autocomplete="new-password"
          class="auth-kit-input"
        />
        <button
          type="button"
          :aria-label="showConfirm ? 'Hide password' : 'Show password'"
          class="auth-kit-eye-button"
          @click="showConfirm = !showConfirm"
        >
          <svg v-if="showConfirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <path d="M1 1l22 22" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
    <p v-if="fieldErrors.confirmPassword" class="auth-kit-error">{{ fieldErrors.confirmPassword }}</p>

    <div v-if="fields.legalConsent.enabled">
      <label class="auth-kit-checkbox-row" for="auth-kit-register-terms">
        <input id="auth-kit-register-terms" v-model="termsAccepted" @change="clearError('termsAccepted')" type="checkbox" />
        <span>
          {{ fields.legalConsent.text }}
          <span v-for="(link, index) in fields.legalConsent.links" :key="link.href">
            {{ index > 0 ? ' ' : '' }}<a :href="link.href" target="_blank" rel="noreferrer">{{ link.label }}</a>
          </span>
        </span>
      </label>
      <p v-if="fieldErrors.termsAccepted" class="auth-kit-error">{{ fieldErrors.termsAccepted }}</p>
    </div>

    <TurnstileWidget
      v-if="fields.turnstile.enabled"
      :site-key="fields.turnstile.siteKey"
      :theme="fields.turnstile.theme"
      :mode="fields.turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />

    <button type="submit" :disabled="authKit.state.value.register.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
      {{ authKit.state.value.register.status === 'submitting' ? 'Creating account…' : 'Create account' }}
    </button>
    <p v-if="authKit.state.value.register.status === 'error' && authKit.state.value.register.error" class="auth-kit-error">
      {{ authKit.state.value.register.error.message }}
    </p>
    <p v-if="authKit.state.value.register.status === 'success'" class="auth-kit-success">Account created.</p>

    <p v-if="onNavigateToLogin" class="auth-kit-status">
      Already have an account? <button type="button" class="auth-kit-button auth-kit-button--ghost" @click="onNavigateToLogin">Sign in</button>
    </p>
  </form>
</template>
