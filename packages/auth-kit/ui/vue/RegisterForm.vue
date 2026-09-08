<script setup lang="ts">
import { computed, ref } from 'vue';

import { resolveFieldConfig } from '../../core/field-config.js';
import { buildRegisterSchema, extractFieldError } from '../../core/validation.js';
import TurnstileWidget from './TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../adapters/vue/use-auth-kit.js';
import type { AuthKitFieldConfig } from '../../core/field-config.js';
import type { PasswordPolicy } from '../../core/validation.js';

const props = defineProps<{ authKit: UseAuthKitResult; fieldConfig?: AuthKitFieldConfig; passwordPolicy?: PasswordPolicy }>();

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<template>
  <form novalidate @submit.prevent="handleSubmit">
    <div>
      <label for="auth-kit-register-email">Correo electrónico</label>
      <input id="auth-kit-register-email" v-model="email" @input="clearError('email')" @blur="validateField('email')" type="email" autocomplete="email" />
      <p v-if="fieldErrors.email" role="alert">{{ fieldErrors.email }}</p>
    </div>

    <div v-if="fields.firstName.enabled">
      <label for="auth-kit-register-firstname">{{ fields.firstName.label }}</label>
      <input id="auth-kit-register-firstname" v-model="firstName" @input="clearError('firstName')" @blur="validateField('firstName')" type="text" />
      <p v-if="fieldErrors.firstName" role="alert">{{ fieldErrors.firstName }}</p>
    </div>

    <div v-if="fields.lastName.enabled">
      <label for="auth-kit-register-lastname">{{ fields.lastName.label }}</label>
      <input id="auth-kit-register-lastname" v-model="lastName" @input="clearError('lastName')" @blur="validateField('lastName')" type="text" />
      <p v-if="fieldErrors.lastName" role="alert">{{ fieldErrors.lastName }}</p>
    </div>

    <div v-if="fields.phone.enabled">
      <label for="auth-kit-register-phone">{{ fields.phone.label }}</label>
      <input id="auth-kit-register-phone" v-model="phone" @input="clearError('phone')" @blur="validateField('phone')" type="tel" />
      <p v-if="fieldErrors.phone" role="alert">{{ fieldErrors.phone }}</p>
    </div>

    <div v-if="fields.profileType.enabled">
      <label for="auth-kit-register-profile-type">{{ fields.profileType.label }}</label>
      <select id="auth-kit-register-profile-type" v-model="profileType">
        <option v-for="option in fields.profileType.options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>

    <div>
      <label for="auth-kit-register-password">Contraseña</label>
      <input id="auth-kit-register-password" v-model="password" @input="clearError('password')" @blur="validateField('password')" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" />
      <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
      <p v-if="fieldErrors.password" role="alert">{{ fieldErrors.password }}</p>
    </div>

    <div>
      <label for="auth-kit-register-confirm-password">Confirmar contraseña</label>
      <input id="auth-kit-register-confirm-password" v-model="confirmPassword" @input="clearError('confirmPassword')" @blur="validateField('confirmPassword')" :type="showConfirm ? 'text' : 'password'" autocomplete="new-password" />
      <button type="button" @click="showConfirm = !showConfirm">{{ showConfirm ? 'Ocultar' : 'Mostrar' }}</button>
      <p v-if="fieldErrors.confirmPassword" role="alert">{{ fieldErrors.confirmPassword }}</p>
    </div>

    <div v-if="fields.legalConsent.enabled">
      <label for="auth-kit-register-terms">
        <input id="auth-kit-register-terms" v-model="termsAccepted" @change="clearError('termsAccepted')" type="checkbox" />
        {{ fields.legalConsent.text }}
        <span v-for="(link, index) in fields.legalConsent.links" :key="link.href">
          {{ index > 0 ? ' ' : '' }}<a :href="link.href" target="_blank" rel="noreferrer">{{ link.label }}</a>
        </span>
      </label>
      <p v-if="fieldErrors.termsAccepted" role="alert">{{ fieldErrors.termsAccepted }}</p>
    </div>

    <TurnstileWidget
      v-if="fields.turnstile.enabled"
      :site-key="fields.turnstile.siteKey"
      :theme="fields.turnstile.theme"
      :mode="fields.turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />

    <button type="submit" :disabled="authKit.state.value.register.status === 'submitting'">
      {{ authKit.state.value.register.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta' }}
    </button>
    <p v-if="authKit.state.value.register.status === 'error' && authKit.state.value.register.error" role="alert">
      {{ authKit.state.value.register.error.message }}
    </p>
    <p v-if="authKit.state.value.register.status === 'success'">Cuenta creada.</p>
  </form>
</template>
