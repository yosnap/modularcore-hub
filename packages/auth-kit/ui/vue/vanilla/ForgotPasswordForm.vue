<script setup lang="ts">
import { ref } from 'vue';

import '../../vanilla-styles.css';
import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const props = defineProps<{
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  onNavigateToLogin?: () => void;
}>();

const email = ref('');
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
  const result = buildForgotPasswordSchema().safeParse({ email: email.value });
  const message = extractFieldError(result, key);
  if (message) {
    fieldErrors.value = { ...fieldErrors.value, [key]: message };
  } else {
    clearError(key);
  }
}

function handleSubmit(): void {
  const result = buildForgotPasswordSchema().safeParse({ email: email.value });
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return;
  }
  fieldErrors.value = {};
  void props.authKit.forgotPassword({ email: email.value, turnstileToken: turnstileToken.value }).catch(() => {});
}
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<template>
  <form novalidate class="auth-kit-form" @submit.prevent="handleSubmit">
    <label class="auth-kit-field" for="auth-kit-forgot-email">
      Email
      <input id="auth-kit-forgot-email" v-model="email" @input="clearError('email')" @blur="validateField('email')" type="email" autocomplete="email" class="auth-kit-input" />
    </label>
    <p v-if="fieldErrors.email" class="auth-kit-error">{{ fieldErrors.email }}</p>
    <TurnstileWidget
      v-if="turnstile?.enabled"
      :site-key="turnstile.siteKey"
      :theme="turnstile.theme"
      :mode="turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />
    <button type="submit" :disabled="authKit.state.value.forgotPassword.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
      {{ authKit.state.value.forgotPassword.status === 'submitting' ? 'Sending…' : 'Send reset link' }}
    </button>
    <p v-if="authKit.state.value.forgotPassword.status === 'error' && authKit.state.value.forgotPassword.error" class="auth-kit-error">
      {{ authKit.state.value.forgotPassword.error.message }}
    </p>
    <p v-if="authKit.state.value.forgotPassword.status === 'success'" class="auth-kit-success">Check your email for a reset link.</p>

    <p v-if="onNavigateToLogin" class="auth-kit-status">
      Remembered your password? <button type="button" class="auth-kit-button auth-kit-button--ghost" @click="onNavigateToLogin">Sign in</button>
    </p>
  </form>
</template>
