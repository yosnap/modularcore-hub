<script setup lang="ts">
import { ref } from 'vue';

import '../../shadcn-theme.css';
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
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';
const linkClass = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

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

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<template>
  <form novalidate class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1.5">
      <label :class="labelClass" for="auth-kit-login-identifier">Email or username</label>
      <input id="auth-kit-login-identifier" v-model="identifier" @input="clearError('identifier')" @blur="validateField('identifier')" type="text" autocomplete="username" :class="inputClass" />
      <p v-if="fieldErrors.identifier" :class="errorClass">{{ fieldErrors.identifier }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label :class="labelClass" for="auth-kit-login-password">Password</label>
        <button v-if="onNavigateToForgotPassword" type="button" :class="linkClass" @click="onNavigateToForgotPassword">
          Forgot your password?
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
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
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
      <p v-if="fieldErrors.password" :class="errorClass">{{ fieldErrors.password }}</p>
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
      :disabled="authKit.state.value.login.status === 'submitting'"
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
    >
      {{ authKit.state.value.login.status === 'submitting' ? 'Signing in…' : 'Sign in' }}
    </button>
    <p v-if="authKit.state.value.login.status === 'error' && authKit.state.value.login.error" :class="errorClass">
      {{ authKit.state.value.login.error.message }}
    </p>
    <p v-if="authKit.state.value.login.status === 'success'" class="text-sm text-green-600">Signed in.</p>

    <p v-if="onNavigateToRegister" class="text-center text-sm text-muted-foreground">
      Don't have an account yet? <button type="button" :class="linkClass" @click="onNavigateToRegister">Sign up</button>
    </p>
  </form>
</template>
