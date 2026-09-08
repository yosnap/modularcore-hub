import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LINK_CLASS = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';
const EYE_PATH = 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z';
const EYE_OFF_PATH =
  'M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens (imported once from `ui/shadcn-theme.css` by the consumer). Same props/behavior as headless. */
@Component({
  selector: 'auth-kit-login-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate class="flex flex-col gap-4" (submit)="handleSubmit($event)">
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-login-identifier">Email or username</label>
        <input id="auth-kit-login-identifier" type="text" autocomplete="username" [class]="inputClass" [value]="identifier" (input)="identifier = $any($event.target).value; clearError('identifier')" (blur)="validateField('identifier')" />
        <p *ngIf="fieldErrors['identifier']" class="text-sm text-destructive">{{ fieldErrors['identifier'] }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium leading-none" for="auth-kit-login-password">Password</label>
          <button *ngIf="onNavigateToForgotPassword" type="button" [class]="linkClass" (click)="onNavigateToForgotPassword()">
            Forgot your password?
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
            [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
            class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
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
        <p *ngIf="fieldErrors['password']" class="text-sm text-destructive">{{ fieldErrors['password'] }}</p>
      </div>

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
        class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {{ authKit.state().login.status === 'submitting' ? 'Signing in…' : 'Sign in' }}
      </button>
      <p *ngIf="authKit.state().login.status === 'error' && authKit.state().login.error" class="text-sm text-destructive">
        {{ authKit.state().login.error?.message }}
      </p>
      <p *ngIf="authKit.state().login.status === 'success'" class="text-sm text-green-600">Signed in.</p>

      <p *ngIf="onNavigateToRegister" class="text-center text-sm text-muted-foreground">
        Don't have an account yet? <button type="button" [class]="linkClass" (click)="onNavigateToRegister()">Sign up</button>
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
