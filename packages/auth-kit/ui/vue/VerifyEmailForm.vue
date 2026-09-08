<script setup lang="ts">
import { ref, watchEffect } from 'vue';

import { buildResendVerificationSchema } from '../../core/validation.js';
import TurnstileWidget from './TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

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

<!-- Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. -->
<template>
  <div>
    <div v-if="token" role="status">
      <p v-if="authKit.state.value.verifyEmail.status === 'submitting'">Verificando tu email…</p>
      <p v-if="authKit.state.value.verifyEmail.status === 'success'">Tu email está verificado.</p>
      <p
        v-if="
          authKit.state.value.verifyEmail.status === 'error' &&
          authKit.state.value.verifyEmail.error
        "
        role="alert"
      >
        {{ authKit.state.value.verifyEmail.error.message }}
      </p>
    </div>

    <form novalidate @submit.prevent="handleResendSubmit">
      <div>
        <label for="auth-kit-resend-email">Correo electrónico</label>
        <input id="auth-kit-resend-email" v-model="email" type="email" autocomplete="email" />
        <p v-if="fieldErrors.email" role="alert">{{ fieldErrors.email }}</p>
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
        :disabled="authKit.state.value.resendVerification.status === 'submitting'"
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
        role="alert"
      >
        {{ authKit.state.value.resendVerification.error.message }}
      </p>
      <p v-if="authKit.state.value.resendVerification.status === 'success'">
        Email de verificación enviado.
      </p>
    </form>
  </div>
</template>
