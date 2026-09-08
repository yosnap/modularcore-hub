<script setup lang="ts">
import { ref, watchEffect } from 'vue';

import { buildResendVerificationSchema } from '../../../core/validation.js';
import TurnstileWidget from '../TurnstileWidget.vue';

import type { UseAuthKitResult } from '../../../adapters/vue/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const props = defineProps<{ authKit: UseAuthKitResult; token?: string; email?: string; turnstile?: TurnstileFieldConfig }>();

const inputClass = 'rounded-md border border-zinc-300 px-2 py-1.5 text-sm';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700';
const errorClass = 'text-sm text-red-600';

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

<!-- Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. -->
<template>
  <div class="flex flex-col gap-4">
    <div v-if="token" role="status" class="text-sm">
      <p v-if="authKit.state.value.verifyEmail.status === 'submitting'" class="text-zinc-700">Verifying your email…</p>
      <p v-if="authKit.state.value.verifyEmail.status === 'success'" class="text-green-600">Your email is verified.</p>
      <p v-if="authKit.state.value.verifyEmail.status === 'error' && authKit.state.value.verifyEmail.error" :class="errorClass">
        {{ authKit.state.value.verifyEmail.error.message }}
      </p>
    </div>

    <form novalidate class="flex flex-col gap-3" @submit.prevent="handleResendSubmit">
      <label :class="labelClass" for="auth-kit-resend-email">
        Email
        <input id="auth-kit-resend-email" v-model="email" type="email" autocomplete="email" :class="inputClass" />
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
        :disabled="authKit.state.value.resendVerification.status === 'submitting'"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        {{ authKit.state.value.resendVerification.status === 'submitting' ? 'Sending…' : 'Resend verification email' }}
      </button>
      <p v-if="authKit.state.value.resendVerification.status === 'error' && authKit.state.value.resendVerification.error" :class="errorClass">
        {{ authKit.state.value.resendVerification.error.message }}
      </p>
      <p v-if="authKit.state.value.resendVerification.status === 'success'" class="text-sm text-green-600">Verification email sent.</p>
    </form>
  </div>
</template>
