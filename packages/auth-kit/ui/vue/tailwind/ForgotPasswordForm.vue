<script setup lang="ts">
import { ref } from 'vue';

import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const props = defineProps<{
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  onNavigateToLogin?: () => void;
}>();

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';

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
    fieldErrors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
    return;
  }
  fieldErrors.value = {};
  void props.authKit
    .forgotPassword({ email: email.value, turnstileToken: turnstileToken.value })
    .catch(() => {});
}
</script>

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<template>
  <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSubmit">
    <label :class="labelClass" for="auth-kit-forgot-email">
      Correo electrónico
      <input
        id="auth-kit-forgot-email"
        v-model="email"
        @input="clearError('email')"
        @blur="validateField('email')"
        type="email"
        autocomplete="email"
        :class="inputClass"
      />
    </label>
    <p v-if="fieldErrors.email" :class="errorClass">{{ fieldErrors.email }}</p>
    <TurnstileWidget
      v-if="turnstile?.enabled"
      :site-key="turnstile.siteKey"
      :theme="turnstile.theme"
      :mode="turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />
    <button
      type="submit"
      :disabled="authKit.state.value.forgotPassword.status === 'submitting'"
      class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {{
        authKit.state.value.forgotPassword.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'
      }}
    </button>
    <p
      v-if="
        authKit.state.value.forgotPassword.status === 'error' &&
        authKit.state.value.forgotPassword.error
      "
      :class="errorClass"
    >
      {{ authKit.state.value.forgotPassword.error.message }}
    </p>
    <p
      v-if="authKit.state.value.forgotPassword.status === 'success'"
      class="text-sm text-green-600 dark:text-green-400"
    >
      Revisa tu correo para ver el enlace de restablecimiento.
    </p>

    <p v-if="onNavigateToLogin" class="text-center text-sm text-zinc-600 dark:text-zinc-400">
      ¿Recordaste tu contraseña?
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
