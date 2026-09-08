import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
@Component({
  selector: 'auth-kit-forgot-password-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate class="auth-kit-form" (submit)="handleSubmit($event)">
      <label class="auth-kit-field" for="auth-kit-forgot-email">
        Correo electrónico
        <input id="auth-kit-forgot-email" type="email" autocomplete="email" class="auth-kit-input" [value]="email" (input)="email = $any($event.target).value; clearError('email')" (blur)="validateField('email')" />
      </label>
      <p *ngIf="fieldErrors['email']" class="auth-kit-error">{{ fieldErrors['email'] }}</p>
      <auth-kit-turnstile-widget
        *ngIf="turnstile?.enabled"
        [siteKey]="turnstile?.siteKey"
        [theme]="turnstile?.theme"
        [mode]="turnstile?.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>
      <button type="submit" [disabled]="authKit.state().forgotPassword.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
        {{ authKit.state().forgotPassword.status === 'submitting' ? 'Enviando…' : 'Enviar enlace' }}
      </button>
      <p *ngIf="authKit.state().forgotPassword.status === 'error' && authKit.state().forgotPassword.error" class="auth-kit-error">
        {{ authKit.state().forgotPassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().forgotPassword.status === 'success'" class="auth-kit-success">Revisa tu correo para ver el enlace de restablecimiento.</p>
    </form>
  `,
})
export class ForgotPasswordFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() turnstile?: TurnstileFieldConfig;

  email = '';
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
    const result = buildForgotPasswordSchema().safeParse({ email: this.email });
    const message = extractFieldError(result, key);
    if (message) {
      this.fieldErrors = { ...this.fieldErrors, [key]: message };
    } else {
      this.clearError(key);
    }
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    const result = buildForgotPasswordSchema().safeParse({ email: this.email });
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit.forgotPassword({ email: this.email, turnstileToken: this.turnstileToken }).catch(() => {});
  }
}
