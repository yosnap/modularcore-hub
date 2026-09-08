<script setup lang="ts">
import { ref, watchEffect } from 'vue';

import '../../shadcn-theme.css';
import { buildResendVerificationSchema } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const props = defineProps<{ authKit: UseAuthKitResult; token?: string; email?: string; turnstile?: TurnstileFieldConfig }>();

const inputClass =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';

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
    fieldErrors.value = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return;
  }
  fieldErrors.value = {};
  void props.authKit.resendVerification({ email: email.value, turnstileToken: turnstileToken.value }).catch(() => {});
}
</script>

<!-- Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. -->
<template>
  <div class="flex flex-col gap-4">
    <div v-if="token" role="status" class="text-sm">
      <p v-if="authKit.state.value.verifyEmail.status === 'submitting'" class="text-muted-foreground">Verificando tu email…</p>
      <p v-if="authKit.state.value.verifyEmail.status === 'success'" class="text-green-600">Tu email está verificado.</p>
      <p v-if="authKit.state.value.verifyEmail.status === 'error' && authKit.state.value.verifyEmail.error" :class="errorClass">
        {{ authKit.state.value.verifyEmail.error.message }}
      </p>
    </div>

    <form novalidate class="flex flex-col gap-4" @submit.prevent="handleResendSubmit">
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="auth-kit-resend-email">Correo electrónico</label>
        <input id="auth-kit-resend-email" v-model="email" type="email" autocomplete="email" :class="inputClass" />
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
        :disabled="authKit.state.value.resendVerification.status === 'submitting'"
        class="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
      >
        {{ authKit.state.value.resendVerification.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación' }}
      </button>
      <p v-if="authKit.state.value.resendVerification.status === 'error' && authKit.state.value.resendVerification.error" :class="errorClass">
        {{ authKit.state.value.resendVerification.error.message }}
      </p>
      <p v-if="authKit.state.value.resendVerification.status === 'success'" class="text-sm text-green-600">Email de verificación enviado.</p>
    </form>
  </div>
</template>
