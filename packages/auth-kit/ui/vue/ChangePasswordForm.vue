<script setup lang="ts">
import { ref } from 'vue';

import { buildChangePasswordSchema, extractFieldError } from '../../core/validation.js';

import type { UseAuthKitResult } from '../../adapters/vue/use-auth-kit.js';
import type { PasswordPolicy } from '../../core/validation.js';

const props = defineProps<{ authKit: UseAuthKitResult; passwordPolicy?: PasswordPolicy }>();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showCurrent = ref(false);
const showNew = ref(false);
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
  const result = buildChangePasswordSchema({ passwordPolicy: props.passwordPolicy }).safeParse({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  });
  const message = extractFieldError(result, key);
  if (message) {
    fieldErrors.value = { ...fieldErrors.value, [key]: message };
  } else {
    clearError(key);
  }
}

function handleSubmit(): void {
  const result = buildChangePasswordSchema({ passwordPolicy: props.passwordPolicy }).safeParse({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  });
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
    return;
  }
  fieldErrors.value = {};
  void props.authKit
    .changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    .catch(() => {});
}
</script>

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<template>
  <form novalidate @submit.prevent="handleSubmit">
    <div>
      <label for="auth-kit-change-current">Contraseña actual</label>
      <input
        id="auth-kit-change-current"
        v-model="currentPassword"
        @input="clearError('currentPassword')"
        @blur="validateField('currentPassword')"
        :type="showCurrent ? 'text' : 'password'"
        autocomplete="current-password"
      />
      <button type="button" @click="showCurrent = !showCurrent">
        {{ showCurrent ? 'Ocultar' : 'Mostrar' }}
      </button>
      <p v-if="fieldErrors.currentPassword" role="alert">{{ fieldErrors.currentPassword }}</p>
    </div>
    <div>
      <label for="auth-kit-change-new">Contraseña nueva</label>
      <input
        id="auth-kit-change-new"
        v-model="newPassword"
        @input="clearError('newPassword')"
        @blur="validateField('newPassword')"
        :type="showNew ? 'text' : 'password'"
        autocomplete="new-password"
      />
      <button type="button" @click="showNew = !showNew">
        {{ showNew ? 'Ocultar' : 'Mostrar' }}
      </button>
      <p v-if="fieldErrors.newPassword" role="alert">{{ fieldErrors.newPassword }}</p>
    </div>
    <div>
      <label for="auth-kit-change-confirm">Confirmar contraseña nueva</label>
      <input
        id="auth-kit-change-confirm"
        v-model="confirmPassword"
        @input="clearError('confirmPassword')"
        @blur="validateField('confirmPassword')"
        :type="showNew ? 'text' : 'password'"
        autocomplete="new-password"
      />
      <p v-if="fieldErrors.confirmPassword" role="alert">{{ fieldErrors.confirmPassword }}</p>
    </div>
    <button type="submit" :disabled="authKit.state.value.changePassword.status === 'submitting'">
      {{
        authKit.state.value.changePassword.status === 'submitting'
          ? 'Actualizando…'
          : 'Actualizar contraseña'
      }}
    </button>
    <p
      v-if="
        authKit.state.value.changePassword.status === 'error' &&
        authKit.state.value.changePassword.error
      "
      role="alert"
    >
      {{ authKit.state.value.changePassword.error.message }}
    </p>
    <p v-if="authKit.state.value.changePassword.status === 'success'">Contraseña actualizada.</p>
  </form>
</template>
