<script setup lang="ts">
import { ref } from 'vue';

import { buildResetPasswordSchema, extractFieldError } from '../../core/validation.js';

import type { UseAuthKitResult } from '../../adapters/vue/use-auth-kit.js';
import type { PasswordPolicy } from '../../core/validation.js';

const props = defineProps<{ authKit: UseAuthKitResult; token: string; passwordPolicy?: PasswordPolicy }>();

const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
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
  const result = buildResetPasswordSchema({ passwordPolicy: props.passwordPolicy }).safeParse({ newPassword: newPassword.value, confirmPassword: confirmPassword.value });
  const message = extractFieldError(result, key);
  if (message) {
    fieldErrors.value = { ...fieldErrors.value, [key]: message };
  } else {
    clearError(key);
  }
}

function handleSubmit(): void {
  const result = buildResetPasswordSchema({ passwordPolicy: props.passwordPolicy }).safeParse({
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  });
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return;
  }
  fieldErrors.value = {};
  void props.authKit.resetPassword({ token: props.token, newPassword: newPassword.value }).catch(() => {});
}
</script>

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<template>
  <form novalidate @submit.prevent="handleSubmit">
    <div>
      <label for="auth-kit-reset-new">New password</label>
      <input id="auth-kit-reset-new" v-model="newPassword" @input="clearError('newPassword')" @blur="validateField('newPassword')" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" />
      <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
      <p v-if="fieldErrors.newPassword" role="alert">{{ fieldErrors.newPassword }}</p>
    </div>
    <div>
      <label for="auth-kit-reset-confirm">Confirm new password</label>
      <input id="auth-kit-reset-confirm" v-model="confirmPassword" @input="clearError('confirmPassword')" @blur="validateField('confirmPassword')" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" />
      <p v-if="fieldErrors.confirmPassword" role="alert">{{ fieldErrors.confirmPassword }}</p>
    </div>
    <button type="submit" :disabled="authKit.state.value.resetPassword.status === 'submitting'">
      {{ authKit.state.value.resetPassword.status === 'submitting' ? 'Resetting…' : 'Reset password' }}
    </button>
    <p v-if="authKit.state.value.resetPassword.status === 'error' && authKit.state.value.resetPassword.error" role="alert">
      {{ authKit.state.value.resetPassword.error.message }}
    </p>
    <p v-if="authKit.state.value.resetPassword.status === 'success'">Password reset.</p>
  </form>
</template>
