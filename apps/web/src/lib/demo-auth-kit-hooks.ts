import type { AuthKitHooks } from '@modularcore/auth-kit/types';

const DEMO_DELAY_MS = 500;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
}

/**
 * In-memory hook simulation for the playground — accepts any email/password after an artificial
 * delay (so the `submitting` state is visible), and lets the demo force an error by typing
 * `fail` as the password/current-password/token, to exercise each form's error state. Never
 * wire hooks like this to production; there is no backend or credential check behind them.
 */
export function createDemoAuthKitHooks(): AuthKitHooks<{ id: string; identifier: string }> {
  return {
    onLogin: async ({ identifier, password }) => {
      await delay();
      if (password === 'fail') throw new Error('Credenciales incorrectas (simulado)');
      return { id: 'demo-user', identifier };
    },
    onRegister: async ({ email, password }) => {
      await delay();
      if (password === 'fail') throw new Error('No se pudo crear la cuenta (simulado)');
      return { id: 'demo-user', identifier: email };
    },
    onChangePassword: async ({ currentPassword }) => {
      await delay();
      if (currentPassword === 'fail') throw new Error('Contraseña actual incorrecta (simulado)');
    },
    onForgotPassword: async ({ email }) => {
      await delay();
      if (email.startsWith('fail')) throw new Error('No se pudo enviar el enlace (simulado)');
    },
    onResetPassword: async () => {
      await delay();
    },
    onVerifyEmail: async ({ token }) => {
      await delay();
      if (token === 'fail-token') throw new Error('Enlace de verificación caducado (simulado)');
    },
    onResendVerification: async ({ email }) => {
      await delay();
      if (email.startsWith('fail')) throw new Error('No se pudo reenviar el email (simulado)');
    },
  };
}
