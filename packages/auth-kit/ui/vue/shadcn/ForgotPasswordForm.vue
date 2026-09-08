<script setup lang="ts">
import { ref } from 'vue';

import '../../shadcn-theme.css';
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
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';
const linkClass = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<template>
  <form novalidate class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-forgot-email">Correo electrónico</label>
      <input id="auth-kit-forgot-email" v-model="email" @input="clearError('email')" @blur="validateField('email')" type="email" autocomplete="email" :class="inputClass" />
      <p v-if="fieldErrors.email" :class="errorClass">{{ fieldErrors.email }}</p>
    </div>
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
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
    >
      {{ authKit.state.value.forgotPassword.status === 'submitting' ? 'Enviando…' : 'Enviar enlace' }}
    </button>
    <p v-if="authKit.state.value.forgotPassword.status === 'error' && authKit.state.value.forgotPassword.error" :class="errorClass">
      {{ authKit.state.value.forgotPassword.error.message }}
    </p>
    <p v-if="authKit.state.value.forgotPassword.status === 'success'" class="text-sm text-green-600">Revisa tu correo para ver el enlace de restablecimiento.</p>

    <p v-if="onNavigateToLogin" class="text-center text-sm text-muted-foreground">
      ¿Recordaste tu contraseña? <button type="button" :class="linkClass" @click="onNavigateToLogin">Iniciar sesión</button>
    </p>
  </form>
</template>
