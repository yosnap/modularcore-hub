<script setup lang="ts">
import { computed, ref } from 'vue';

import '../../shadcn-theme.css';
import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

const props = defineProps<{ authKit: UseAuthKitResult; token: string; passwordPolicy?: PasswordPolicy }>();

const inputClass =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';

const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const fieldErrors = ref<Record<string, string>>({});

const strength = computed(() => evaluatePasswordStrength(newPassword.value, props.passwordPolicy));

function strengthBarClass(index: number): string {
  const s = strength.value;
  if (index >= s.score) return 'bg-muted';
  if (s.score === s.total) return 'bg-green-500';
  if (s.score >= s.total - 1) return 'bg-yellow-500';
  return 'bg-destructive';
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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<template>
  <form novalidate class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-reset-new">Contraseña nueva</label>
      <div class="relative">
        <input
          id="auth-kit-reset-new"
          v-model="newPassword" @input="clearError('newPassword')" @blur="validateField('newPassword')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
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
      <div v-if="newPassword.length > 0" class="flex flex-col gap-1.5">
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
      <p v-if="fieldErrors.newPassword" :class="errorClass">{{ fieldErrors.newPassword }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-reset-confirm">Confirmar contraseña nueva</label>
      <input id="auth-kit-reset-confirm" v-model="confirmPassword" @input="clearError('confirmPassword')" @blur="validateField('confirmPassword')" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :class="inputClass" />
      <p v-if="fieldErrors.confirmPassword" :class="errorClass">{{ fieldErrors.confirmPassword }}</p>
    </div>

    <button
      type="submit"
      :disabled="authKit.state.value.resetPassword.status === 'submitting'"
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
    >
      {{ authKit.state.value.resetPassword.status === 'submitting' ? 'Restableciendo…' : 'Restablecer contraseña' }}
    </button>
    <p v-if="authKit.state.value.resetPassword.status === 'error' && authKit.state.value.resetPassword.error" :class="errorClass">
      {{ authKit.state.value.resetPassword.error.message }}
    </p>
    <p v-if="authKit.state.value.resetPassword.status === 'success'" class="text-sm text-green-600">Contraseña restablecida.</p>
  </form>
</template>
