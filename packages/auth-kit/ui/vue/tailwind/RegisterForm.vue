<script setup lang="ts">
import { computed, ref } from 'vue';

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

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';
const eyeButtonClass =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

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
  const values: Record<string, unknown> = {
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  };
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
  const result = buildRegisterSchema(fields.value, {
    passwordPolicy: props.passwordPolicy,
  }).safeParse(collectValues());
  const message = extractFieldError(result, key);
  if (message) {
    fieldErrors.value = { ...fieldErrors.value, [key]: message };
  } else {
    clearError(key);
  }
}

function handleSubmit(): void {
  const f = fields.value;
  const values: Record<string, unknown> = {
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  };
  if (f.firstName.enabled) values.firstName = firstName.value;
  if (f.lastName.enabled) values.lastName = lastName.value;
  if (f.phone.enabled) values.phone = phone.value;
  if (f.profileType.enabled) values.profileType = profileType.value;
  if (f.legalConsent.enabled && f.legalConsent.required) values.termsAccepted = termsAccepted.value;

  const result = buildRegisterSchema(f, { passwordPolicy: props.passwordPolicy }).safeParse(values);
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
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

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<template>
  <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSubmit">
    <label :class="labelClass" for="auth-kit-register-email">
      Correo electrónico
      <input
        id="auth-kit-register-email"
        v-model="email"
        @input="clearError('email')"
        @blur="validateField('email')"
        type="email"
        autocomplete="email"
        :class="inputClass"
      />
    </label>
    <p v-if="fieldErrors.email" :class="errorClass">{{ fieldErrors.email }}</p>

    <label v-if="fields.firstName.enabled" :class="labelClass" for="auth-kit-register-firstname">
      {{ fields.firstName.label }}
      <input
        id="auth-kit-register-firstname"
        v-model="firstName"
        @input="clearError('firstName')"
        @blur="validateField('firstName')"
        type="text"
        :class="inputClass"
      />
    </label>
    <p v-if="fieldErrors.firstName" :class="errorClass">{{ fieldErrors.firstName }}</p>

    <label v-if="fields.lastName.enabled" :class="labelClass" for="auth-kit-register-lastname">
      {{ fields.lastName.label }}
      <input
        id="auth-kit-register-lastname"
        v-model="lastName"
        @input="clearError('lastName')"
        @blur="validateField('lastName')"
        type="text"
        :class="inputClass"
      />
    </label>
    <p v-if="fieldErrors.lastName" :class="errorClass">{{ fieldErrors.lastName }}</p>

    <label v-if="fields.phone.enabled" :class="labelClass" for="auth-kit-register-phone">
      {{ fields.phone.label }}
      <input
        id="auth-kit-register-phone"
        v-model="phone"
        @input="clearError('phone')"
        @blur="validateField('phone')"
        type="tel"
        :class="inputClass"
      />
    </label>
    <p v-if="fieldErrors.phone" :class="errorClass">{{ fieldErrors.phone }}</p>

    <label
      v-if="fields.profileType.enabled"
      :class="labelClass"
      for="auth-kit-register-profile-type"
    >
      {{ fields.profileType.label }}
      <select
        id="auth-kit-register-profile-type"
        v-model="profileType"
        :class="`${inputClass} dark:[color-scheme:dark]`"
      >
        <option
          v-for="option in fields.profileType.options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <label :class="labelClass" for="auth-kit-register-password">
      Contraseña
      <div class="relative">
        <input
          id="auth-kit-register-password"
          v-model="password"
          @input="clearError('password')"
          @blur="validateField('password')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :class="eyeButtonClass"
          @click="showPassword = !showPassword"
        >
          <svg
            v-if="showPassword"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path
              d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <path d="M1 1l22 22" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </label>
    <p v-if="fieldErrors.password" :class="errorClass">{{ fieldErrors.password }}</p>

    <label :class="labelClass" for="auth-kit-register-confirm-password">
      Confirmar contraseña
      <div class="relative">
        <input
          id="auth-kit-register-confirm-password"
          v-model="confirmPassword"
          @input="clearError('confirmPassword')"
          @blur="validateField('confirmPassword')"
          :type="showConfirm ? 'text' : 'password'"
          autocomplete="new-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :class="eyeButtonClass"
          @click="showConfirm = !showConfirm"
        >
          <svg
            v-if="showConfirm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path
              d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <path d="M1 1l22 22" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </label>
    <p v-if="fieldErrors.confirmPassword" :class="errorClass">{{ fieldErrors.confirmPassword }}</p>

    <div v-if="fields.legalConsent.enabled">
      <label
        class="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
        for="auth-kit-register-terms"
      >
        <input
          id="auth-kit-register-terms"
          v-model="termsAccepted"
          @change="clearError('termsAccepted')"
          type="checkbox"
          class="mt-0.5"
        />
        <span>
          {{ fields.legalConsent.text }}
          <span v-for="(link, index) in fields.legalConsent.links" :key="link.href">
            {{ index > 0 ? ' ' : ''
            }}<a
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >{{ link.label }}</a
            >
          </span>
        </span>
      </label>
      <p v-if="fieldErrors.termsAccepted" :class="errorClass">{{ fieldErrors.termsAccepted }}</p>
    </div>

    <TurnstileWidget
      v-if="fields.turnstile.enabled"
      :site-key="fields.turnstile.siteKey"
      :theme="fields.turnstile.theme"
      :mode="fields.turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />

    <button
      type="submit"
      :disabled="authKit.state.value.register.status === 'submitting'"
      class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {{
        authKit.state.value.register.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta'
      }}
    </button>
    <p
      v-if="authKit.state.value.register.status === 'error' && authKit.state.value.register.error"
      :class="errorClass"
    >
      {{ authKit.state.value.register.error.message }}
    </p>
    <p
      v-if="authKit.state.value.register.status === 'success'"
      class="text-sm text-green-600 dark:text-green-400"
    >
      Cuenta creada.
    </p>

    <p v-if="onNavigateToLogin" class="text-center text-sm text-zinc-600 dark:text-zinc-400">
      ¿Ya tienes una cuenta?
      <button
        type="button"
        class="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
        @click="onNavigateToLogin"
      >
        Iniciar sesión
      </button>
    </p>
  </form>
</template>
