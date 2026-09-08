import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildForgotPasswordSchema, extractFieldError } from '../../core/validation.js';
import { TurnstileWidgetComponent } from './turnstile-widget.component.js';

import type { AuthKitService } from '../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
@Component({
  selector: 'auth-kit-forgot-password-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate (submit)="handleSubmit($event)">
      <div>
        <label for="auth-kit-forgot-email">Correo electrónico</label>
        <input
          id="auth-kit-forgot-email"
          type="email"
          autocomplete="email"
          [value]="email"
          (input)="email = $any($event.target).value; clearError('email')"
          (blur)="validateField('email')"
        />
        <p *ngIf="fieldErrors['email']" role="alert">{{ fieldErrors['email'] }}</p>
      </div>
      <auth-kit-turnstile-widget
        *ngIf="turnstile?.enabled"
        [siteKey]="turnstile?.siteKey"
        [theme]="turnstile?.theme"
        [mode]="turnstile?.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>
      <button type="submit" [disabled]="authKit.state().forgotPassword.status === 'submitting'">
        {{ authKit.state().forgotPassword.status === 'submitting' ? 'Enviando…' : 'Enviar enlace' }}
      </button>
      <p
        *ngIf="
          authKit.state().forgotPassword.status === 'error' && authKit.state().forgotPassword.error
        "
        role="alert"
      >
        {{ authKit.state().forgotPassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().forgotPassword.status === 'success'">
        Revisa tu correo para ver el enlace de restablecimiento.
      </p>
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
      this.fieldErrors = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .forgotPassword({ email: this.email, turnstileToken: this.turnstileToken })
      .catch(() => {});
  }
}
