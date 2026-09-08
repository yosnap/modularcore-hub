import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const INPUT_CLASS =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const LINK_CLASS =
  'appearance-none border-0 bg-transparent p-0 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
const EYE_BUTTON_CLASS =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
const EYE_PATH = 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z';
const EYE_OFF_PATH =
  'M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
@Component({
  selector: 'auth-kit-login-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate class="flex flex-col gap-3" (submit)="handleSubmit($event)">
      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-login-identifier">
        Correo electrónico o nombre de usuario
        <input
          id="auth-kit-login-identifier"
          type="text"
          autocomplete="username"
          [class]="inputClass"
          [value]="identifier"
          (input)="identifier = $any($event.target).value; clearError('identifier')" (blur)="validateField('identifier')"
        />
      </label>
      <p *ngIf="fieldErrors['identifier']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['identifier'] }}</p>

      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <label class="text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-login-password">Contraseña</label>
          <button *ngIf="onNavigateToForgotPassword" type="button" [class]="linkClass" (click)="onNavigateToForgotPassword()">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div class="relative">
          <input
            id="auth-kit-login-password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            [class]="inputClass + ' pr-9'"
            [value]="password"
            (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
          />
          <button
            type="button"
            [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [class]="eyeButtonClass"
            (click)="showPassword = !showPassword"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <ng-container *ngIf="showPassword; else eyeOpen">
                <path [attr.d]="eyeOffPath" />
                <path d="M1 1l22 22" />
              </ng-container>
              <ng-template #eyeOpen>
                <path [attr.d]="eyePath" />
                <circle cx="12" cy="12" r="3" />
              </ng-template>
            </svg>
          </button>
        </div>
      </div>
      <p *ngIf="fieldErrors['password']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['password'] }}</p>

      <auth-kit-turnstile-widget
        *ngIf="turnstile?.enabled"
        [siteKey]="turnstile?.siteKey"
        [theme]="turnstile?.theme"
        [mode]="turnstile?.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>

      <button
        type="submit"
        [disabled]="authKit.state().login.status === 'submitting'"
        class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {{ authKit.state().login.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión' }}
      </button>
      <p *ngIf="authKit.state().login.status === 'error' && authKit.state().login.error" class="text-sm text-red-600 dark:text-red-400">
        {{ authKit.state().login.error?.message }}
      </p>
      <p *ngIf="authKit.state().login.status === 'success'" class="text-sm text-green-600 dark:text-green-400">Sesión iniciada.</p>

      <p *ngIf="onNavigateToRegister" class="text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿Aún no tienes una cuenta?
        <button
          type="button"
          class="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          (click)="onNavigateToRegister()"
        >
          Registrarse
        </button>
      </p>
    </form>
  `,
})
export class LoginFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  @Input() onNavigateToRegister?: () => void;
  @Input() onNavigateToForgotPassword?: () => void;

  readonly inputClass = INPUT_CLASS;
  readonly linkClass = LINK_CLASS;
  readonly eyeButtonClass = EYE_BUTTON_CLASS;
  readonly eyePath = EYE_PATH;
  readonly eyeOffPath = EYE_OFF_PATH;

  identifier = '';
  password = '';
  showPassword = false;
  turnstileToken: string | null = null;
  fieldErrors: Record<string, string> = {};

  
  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  clearError(key: string): void {
    if (key in this.fieldErrors) {
      const next = { ...this.fieldErrors };
      delete next[key];
      this.fieldErrors = next;
    }
  }

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  validateField(key: string): void {
    const result = buildLoginSchema().safeParse({ identifier: this.identifier, password: this.password });
    const message = extractFieldError(result, key);
    if (message) {
      this.fieldErrors = { ...this.fieldErrors, [key]: message };
    } else {
      this.clearError(key);
    }
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    const result = buildLoginSchema().safeParse({ identifier: this.identifier, password: this.password });
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .login({ identifier: this.identifier, password: this.password, turnstileToken: this.turnstileToken })
      .catch(() => {});
  }
}
