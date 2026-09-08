<script setup lang="ts">
import { ref } from 'vue';

import { buildLoginSchema, extractFieldError } from '../../core/validation.js';
import TurnstileWidget from './TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

const props = defineProps<{ authKit: UseAuthKitResult; turnstile?: TurnstileFieldConfig }>();

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<template>
  <form novalidate @submit.prevent="handleSubmit">
    <div>
      <label for="auth-kit-login-identifier">Email or username</label>
      <input id="auth-kit-login-identifier" v-model="identifier" @input="clearError('identifier')" @blur="validateField('identifier')" type="text" autocomplete="username" />
      <p v-if="fieldErrors.identifier" role="alert">{{ fieldErrors.identifier }}</p>
    </div>
    <div>
      <label for="auth-kit-login-password">Password</label>
      <input id="auth-kit-login-password" v-model="password" @input="clearError('password')" @blur="validateField('password')" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" />
      <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
      <p v-if="fieldErrors.password" role="alert">{{ fieldErrors.password }}</p>
    </div>
    <TurnstileWidget
      v-if="turnstile?.enabled"
      :site-key="turnstile.siteKey"
      :theme="turnstile.theme"
      :mode="turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />
    <button type="submit" :disabled="authKit.state.value.login.status === 'submitting'">
      {{ authKit.state.value.login.status === 'submitting' ? 'Signing in…' : 'Sign in' }}
    </button>
    <p v-if="authKit.state.value.login.status === 'error' && authKit.state.value.login.error" role="alert">
      {{ authKit.state.value.login.error.message }}
    </p>
    <p v-if="authKit.state.value.login.status === 'success'">Signed in.</p>
  </form>
</template>
