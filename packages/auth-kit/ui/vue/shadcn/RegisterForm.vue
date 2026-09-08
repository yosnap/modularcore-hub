<script setup lang="ts">
import { computed, ref } from 'vue';

import '../../shadcn-theme.css';
import { resolveFieldConfig } from '../../../core/field-config.js';
import { evaluatePasswordStrength } from '../../../core/password-strength.js';
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
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';
const linkClass = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

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

const strength = computed(() => evaluatePasswordStrength(password.value, props.passwordPolicy));

function strengthBarClass(index: number): string {
  const s = strength.value;
  if (index >= s.score) return 'bg-muted';
  if (s.score === s.total) return 'bg-green-500';
  if (s.score >= s.total - 1) return 'bg-yellow-500';
  return 'bg-destructive';
}


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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<template>
  <form novalidate class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div v-if="fields.profileType.enabled" class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="tablist" :aria-label="fields.profileType.label">
      <button
        v-for="option in fields.profileType.options"
        :key="option.value"
        type="button"
        role="tab"
        :aria-selected="profileType === option.value"
        class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
        :class="profileType === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
        @click="profileType = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-register-email">Email</label>
      <input id="auth-kit-register-email" v-model="email" @input="clearError('email')" @blur="validateField('email')" type="email" autocomplete="email" :class="inputClass" />
      <p v-if="fieldErrors.email" :class="errorClass">{{ fieldErrors.email }}</p>
    </div>

    <div v-if="fields.firstName.enabled" class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-register-firstname">{{ fields.firstName.label }}</label>
      <input id="auth-kit-register-firstname" v-model="firstName" @input="clearError('firstName')" @blur="validateField('firstName')" type="text" :class="inputClass" />
      <p v-if="fieldErrors.firstName" :class="errorClass">{{ fieldErrors.firstName }}</p>
    </div>

    <div v-if="fields.lastName.enabled" class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-register-lastname">{{ fields.lastName.label }}</label>
      <input id="auth-kit-register-lastname" v-model="lastName" @input="clearError('lastName')" @blur="validateField('lastName')" type="text" :class="inputClass" />
      <p v-if="fieldErrors.lastName" :class="errorClass">{{ fieldErrors.lastName }}</p>
    </div>

    <div v-if="fields.phone.enabled" class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-register-phone">{{ fields.phone.label }}</label>
      <input id="auth-kit-register-phone" v-model="phone" @input="clearError('phone')" @blur="validateField('phone')" type="tel" :class="inputClass" />
      <p v-if="fieldErrors.phone" :class="errorClass">{{ fieldErrors.phone }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-register-password">Password</label>
      <div class="relative">
        <input
          id="auth-kit-register-password"
          v-model="password" @input="clearError('password')" @blur="validateField('password')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
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
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <div v-if="password.length > 0" class="flex flex-col gap-1.5">
        <div class="flex gap-1">
          <span v-for="index in strength.total" :key="index" class="h-1 flex-1 rounded-full" :class="strengthBarClass(index - 1)"></span>
        </div>
        <ul class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <li
            v-for="requirement in strength.requirements"
            :key="requirement.key"
            class="flex items-center gap-1"
            :class="requirement.met ? 'text-green-600' : 'text-muted-foreground'"
          >
            <svg v-if="requirement.met" viewBox="0 0 11 11" class="h-3 w-3">
              <path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
            <span v-else class="inline-block h-3 w-3" aria-hidden="true">·</span>
            {{ requirement.label }}
          </li>
        </ul>
      </div>
      <p v-if="fieldErrors.password" :class="errorClass">{{ fieldErrors.password }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-register-confirm-password">Confirm password</label>
      <div class="relative">
        <input
          id="auth-kit-register-confirm-password"
          v-model="confirmPassword" @input="clearError('confirmPassword')" @blur="validateField('confirmPassword')"
          :type="showConfirm ? 'text' : 'password'"
          autocomplete="new-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showConfirm ? 'Hide password' : 'Show password'"
          class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
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
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <p v-if="fieldErrors.confirmPassword" :class="errorClass">{{ fieldErrors.confirmPassword }}</p>
    </div>

    <div v-if="fields.legalConsent.enabled">
      <div class="flex items-start gap-2">
        <input id="auth-kit-register-terms" v-model="termsAccepted" @change="clearError('termsAccepted')" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-primary" />
        <label for="auth-kit-register-terms" class="text-sm text-muted-foreground">
          {{ fields.legalConsent.text }}
          <span v-for="(link, index) in fields.legalConsent.links" :key="link.href">
            {{ index > 0 ? ' ' : '' }}<a :href="link.href" target="_blank" rel="noreferrer" class="font-medium text-foreground hover:underline">{{ link.label }}</a>
          </span>
        </label>
      </div>
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
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
    >
      {{ authKit.state.value.register.status === 'submitting' ? 'Creating account…' : 'Create account' }}
    </button>
    <p v-if="authKit.state.value.register.status === 'error' && authKit.state.value.register.error" :class="errorClass">
      {{ authKit.state.value.register.error.message }}
    </p>
    <p v-if="authKit.state.value.register.status === 'success'" class="text-sm text-green-600">Account created.</p>

    <p v-if="onNavigateToLogin" class="text-center text-sm text-muted-foreground">
      Already have an account? <button type="button" :class="linkClass" @click="onNavigateToLogin">Sign in</button>
    </p>
  </form>
</template>
