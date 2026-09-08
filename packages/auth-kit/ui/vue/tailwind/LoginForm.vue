<script setup lang="ts">
import { ref } from 'vue';

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

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';
const linkClass =
  'appearance-none border-0 bg-transparent p-0 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
const eyeButtonClass =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

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

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<template>
  <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSubmit">
    <label :class="labelClass" for="auth-kit-login-identifier">
      Correo electrónico o nombre de usuario
      <input id="auth-kit-login-identifier" v-model="identifier" @input="clearError('identifier')" @blur="validateField('identifier')" type="text" autocomplete="username" :class="inputClass" />
    </label>
    <p v-if="fieldErrors.identifier" :class="errorClass">{{ fieldErrors.identifier }}</p>

    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <label class="text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-login-password">Contraseña</label>
        <button v-if="onNavigateToForgotPassword" type="button" :class="linkClass" @click="onNavigateToForgotPassword">
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <div class="relative">
        <input
          id="auth-kit-login-password"
          v-model="password" @input="clearError('password')" @blur="validateField('password')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          :class="`${inputClass} pr-9`"
        />
        <button
          type="button"
          :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :class="eyeButtonClass"
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
    </div>
    <p v-if="fieldErrors.password" :class="errorClass">{{ fieldErrors.password }}</p>

    <TurnstileWidget
      v-if="turnstile?.enabled"
      :site-key="turnstile.siteKey"
      :theme="turnstile.theme"
      :mode="turnstile.mode"
      @token="(t) => (turnstileToken = t)"
    />

    <button
      type="submit"
      :disabled="authKit.state.value.login.status === 'submitting'"
      class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {{ authKit.state.value.login.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión' }}
    </button>
    <p v-if="authKit.state.value.login.status === 'error' && authKit.state.value.login.error" :class="errorClass">
      {{ authKit.state.value.login.error.message }}
    </p>
    <p v-if="authKit.state.value.login.status === 'success'" class="text-sm text-green-600 dark:text-green-400">Sesión iniciada.</p>

    <p v-if="onNavigateToRegister" class="text-center text-sm text-zinc-600 dark:text-zinc-400">
      ¿Aún no tienes una cuenta?
      <button
        type="button"
        class="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
        @click="onNavigateToRegister"
      >
        Registrarse
      </button>
    </p>
  </form>
</template>
