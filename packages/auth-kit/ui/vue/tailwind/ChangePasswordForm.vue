<script setup lang="ts">
import { ref } from 'vue';

import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

const props = defineProps<{ authKit: UseAuthKitResult; passwordPolicy?: PasswordPolicy }>();

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';
const eyeButtonClass =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

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
  const result = buildChangePasswordSchema({ passwordPolicy: props.passwordPolicy }).safeParse({ currentPassword: currentPassword.value, newPassword: newPassword.value, confirmPassword: confirmPassword.value });
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
    fieldErrors.value = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return;
  }
  fieldErrors.value = {};
  void props.authKit.changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value }).catch(() => {});
}
</script>

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<template>
  <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSubmit">
    <label :class="labelClass" for="auth-kit-change-current">
      Contraseña actual
      <div class="relative">
        <input
          id="auth-kit-change-current"
          v-model="currentPassword" @input="clearError('currentPassword')" @blur="validateField('currentPassword')"
          :type="showCurrent ? 'text' : 'password'"
          autocomplete="current-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :class="eyeButtonClass"
          @click="showCurrent = !showCurrent"
        >
          <svg
            v-if="showCurrent"
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
    </label>
    <p v-if="fieldErrors.currentPassword" :class="errorClass">{{ fieldErrors.currentPassword }}</p>

    <label :class="labelClass" for="auth-kit-change-new">
      Contraseña nueva
      <div class="relative">
        <input
          id="auth-kit-change-new"
          v-model="newPassword" @input="clearError('newPassword')" @blur="validateField('newPassword')"
          :type="showNew ? 'text' : 'password'"
          autocomplete="new-password"
          :class="`${inputClass} pr-9`"
        />
        <button type="button" :aria-label="showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'" :class="eyeButtonClass" @click="showNew = !showNew">
          <svg v-if="showNew" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
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
    </label>
    <p v-if="fieldErrors.newPassword" :class="errorClass">{{ fieldErrors.newPassword }}</p>

    <label :class="labelClass" for="auth-kit-change-confirm">
      Confirmar contraseña nueva
      <input id="auth-kit-change-confirm" v-model="confirmPassword" @input="clearError('confirmPassword')" @blur="validateField('confirmPassword')" :type="showNew ? 'text' : 'password'" autocomplete="new-password" :class="inputClass" />
    </label>
    <p v-if="fieldErrors.confirmPassword" :class="errorClass">{{ fieldErrors.confirmPassword }}</p>

    <button
      type="submit"
      :disabled="authKit.state.value.changePassword.status === 'submitting'"
      class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {{ authKit.state.value.changePassword.status === 'submitting' ? 'Actualizando…' : 'Actualizar contraseña' }}
    </button>
    <p v-if="authKit.state.value.changePassword.status === 'error' && authKit.state.value.changePassword.error" :class="errorClass">
      {{ authKit.state.value.changePassword.error.message }}
    </p>
    <p v-if="authKit.state.value.changePassword.status === 'success'" class="text-sm text-green-600 dark:text-green-400">Contraseña actualizada.</p>
  </form>
</template>
