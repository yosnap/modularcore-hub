<script setup lang="ts">
import { ref, watchEffect } from 'vue';

import '../../vanilla-styles.css';
import { buildResendVerificationSchema } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const props = defineProps<{
  authKit: UseAuthKitResult;
  token?: string;
  email?: string;
  turnstile?: TurnstileFieldConfig;
}>();

const email = ref(props.email ?? '');
const turnstileToken = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});
let verifyAttempted = false;

watchEffect(() => {
  if (!props.token || verifyAttempted) return;
  verifyAttempted = true;
  void props.authKit.verifyEmail({ token: props.token }).catch(() => {});
});

function handleResendSubmit(): void {
  const result = buildResendVerificationSchema().safeParse({ email: email.value });
  if (!result.success) {
    fieldErrors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
    return;
  }
  fieldErrors.value = {};
  void props.authKit
    .resendVerification({ email: email.value, turnstileToken: turnstileToken.value })
    .catch(() => {});
}
</script>

<!-- Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. -->
<template>
  <div>
    <div v-if="token" role="status" class="auth-kit-status">
      <p v-if="authKit.state.value.verifyEmail.status === 'submitting'">Verificando tu email…</p>
      <p v-if="authKit.state.value.verifyEmail.status === 'success'" class="auth-kit-success">
        Tu email está verificado.
      </p>
      <p
        v-if="
          authKit.state.value.verifyEmail.status === 'error' &&
          authKit.state.value.verifyEmail.error
        "
        class="auth-kit-error"
      >
        {{ authKit.state.value.verifyEmail.error.message }}
      </p>
    </div>

    <form novalidate class="auth-kit-form" @submit.prevent="handleResendSubmit">
      <label class="auth-kit-field" for="auth-kit-resend-email">
        Correo electrónico
        <input
          id="auth-kit-resend-email"
          v-model="email"
          type="email"
          autocomplete="email"
          class="auth-kit-input"
        />
      </label>
      <p v-if="fieldErrors.email" class="auth-kit-error">{{ fieldErrors.email }}</p>
      <TurnstileWidget
        v-if="turnstile?.enabled"
        :site-key="turnstile.siteKey"
        :theme="turnstile.theme"
        :mode="turnstile.mode"
        @token="(t) => (turnstileToken = t)"
      />
      <button
        type="submit"
        :disabled="authKit.state.value.resendVerification.status === 'submitting'"
        class="auth-kit-button"
      >
        {{
          authKit.state.value.resendVerification.status === 'submitting'
            ? 'Enviando…'
            : 'Reenviar email de verificación'
        }}
      </button>
      <p
        v-if="
          authKit.state.value.resendVerification.status === 'error' &&
          authKit.state.value.resendVerification.error
        "
        class="auth-kit-error"
      >
        {{ authKit.state.value.resendVerification.error.message }}
      </p>
      <p
        v-if="authKit.state.value.resendVerification.status === 'success'"
        class="auth-kit-success"
      >
        Email de verificación enviado.
      </p>
    </form>
  </div>
</template>
