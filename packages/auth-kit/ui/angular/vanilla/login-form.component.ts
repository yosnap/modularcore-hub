import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes (see `ui/vanilla-styles.css`). */
@Component({
  selector: 'auth-kit-login-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate class="auth-kit-form" (submit)="handleSubmit($event)">
      <label class="auth-kit-field" for="auth-kit-login-identifier">
        Email or username
        <input id="auth-kit-login-identifier" type="text" autocomplete="username" class="auth-kit-input" [value]="identifier" (input)="identifier = $any($event.target).value; clearError('identifier')" (blur)="validateField('identifier')" />
      </label>
      <p *ngIf="fieldErrors['identifier']" class="auth-kit-error">{{ fieldErrors['identifier'] }}</p>

      <label class="auth-kit-field" for="auth-kit-login-password">
        Password
        <span class="auth-kit-field__row">
          <input
            id="auth-kit-login-password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            class="auth-kit-input"
            [value]="password"
            (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
          />
          <button type="button" class="auth-kit-button auth-kit-button--ghost" (click)="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
        </span>
      </label>
      <p *ngIf="fieldErrors['password']" class="auth-kit-error">{{ fieldErrors['password'] }}</p>

      <auth-kit-turnstile-widget
        *ngIf="turnstile?.enabled"
        [siteKey]="turnstile?.siteKey"
        [theme]="turnstile?.theme"
        [mode]="turnstile?.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>

      <button type="submit" [disabled]="authKit.state().login.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
        {{ authKit.state().login.status === 'submitting' ? 'Signing in…' : 'Sign in' }}
      </button>
      <p *ngIf="authKit.state().login.status === 'error' && authKit.state().login.error" class="auth-kit-error">
        {{ authKit.state().login.error?.message }}
      </p>
      <p *ngIf="authKit.state().login.status === 'success'" class="auth-kit-success">Signed in.</p>
    </form>
  `,
})
export class LoginFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() turnstile?: TurnstileFieldConfig;

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
