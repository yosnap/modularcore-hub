<script setup lang="ts">
import { ref } from 'vue';

import '../../vanilla-styles.css';
import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const props = defineProps<{
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}>();

const identifier = ref('');
const password = ref('');
const showPassword = ref(false);
const turnstileToken = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});


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
  const result = buildLoginSchema().safeParse({ identifier: identifier.value, password: password.value });
  const message = extractFieldError(result, key);
  if (message) {
    fieldErrors.value = { ...fieldErrors.value, [key]: message };
  } else {
    clearError(key);
  }
}

function handleSubmit(): void {
  const result = buildLoginSchema().safeParse({ identifier: identifier.value, password: password.value });
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return;
  }
  fieldErrors.value = {};
  void props.authKit
    .login({ identifier: identifier.value, password: password.value, turnstileToken: turnstileToken.value })
    .catch(() => {});
}
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<template>
  <form novalidate class="auth-kit-form" @submit.prevent="handleSubmit">
    <label class="auth-kit-field" for="auth-kit-login-identifier">
      Email or username
      <input id="auth-kit-login-identifier" v-model="identifier" @input="clearError('identifier')" @blur="validateField('identifier')" type="text" autocomplete="username" class="auth-kit-input" />
    </label>
    <p v-if="fieldErrors.identifier" class="auth-kit-error">{{ fieldErrors.identifier }}</p>

    <div class="auth-kit-field">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <label for="auth-kit-login-password">Password</label>
        <button v-if="onNavigateToForgotPassword" type="button" class="auth-kit-button auth-kit-button--ghost" @click="onNavigateToForgotPassword">
          Forgot your password?
        </button>
      </div>
      <div class="auth-kit-field__control">
        <input
          id="auth-kit-login-password"
          v-model="password" @input="clearError('password')" @blur="validateField('password')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
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

    <TurnstileWidget
      v-if="turnstile?.enabled"
      :site-key="turnstile.siteKey"
      :theme="turnstile.theme"
      :mode="turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />

    <button type="submit" :disabled="authKit.state.value.login.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
      {{ authKit.state.value.login.status === 'submitting' ? 'Signing in…' : 'Sign in' }}
    </button>
    <p v-if="authKit.state.value.login.status === 'error' && authKit.state.value.login.error" class="auth-kit-error">
      {{ authKit.state.value.login.error.message }}
    </p>
    <p v-if="authKit.state.value.login.status === 'success'" class="auth-kit-success">Signed in.</p>

    <p v-if="onNavigateToRegister" class="auth-kit-status">
      Don't have an account yet? <button type="button" class="auth-kit-button auth-kit-button--ghost" @click="onNavigateToRegister">Sign up</button>
    </p>
  </form>
</template>
