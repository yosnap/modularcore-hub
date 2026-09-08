import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { PasswordPolicy } from '../../../core/validation.js';

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
@Component({
  selector: 'auth-kit-reset-password-form',
  standalone: true,
  imports: [NgIf],
  template: `
    <form novalidate class="auth-kit-form" (submit)="handleSubmit($event)">
      <label class="auth-kit-field" for="auth-kit-reset-new">
        New password
        <span class="auth-kit-field__row">
          <input
            id="auth-kit-reset-new"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            class="auth-kit-input"
            [value]="newPassword"
            (input)="newPassword = $any($event.target).value; clearError('newPassword')" (blur)="validateField('newPassword')"
          />
          <button type="button" class="auth-kit-button auth-kit-button--ghost" (click)="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
        </span>
      </label>
      <p *ngIf="fieldErrors['newPassword']" class="auth-kit-error">{{ fieldErrors['newPassword'] }}</p>

      <label class="auth-kit-field" for="auth-kit-reset-confirm">
        Confirm new password
        <input
          id="auth-kit-reset-confirm"
          [type]="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          class="auth-kit-input"
          [value]="confirmPassword"
          (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')" (blur)="validateField('confirmPassword')"
        />
      </label>
      <p *ngIf="fieldErrors['confirmPassword']" class="auth-kit-error">{{ fieldErrors['confirmPassword'] }}</p>

      <button type="submit" [disabled]="authKit.state().resetPassword.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
        {{ authKit.state().resetPassword.status === 'submitting' ? 'Resetting…' : 'Reset password' }}
      </button>
      <p *ngIf="authKit.state().resetPassword.status === 'error' && authKit.state().resetPassword.error" class="auth-kit-error">
        {{ authKit.state().resetPassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().resetPassword.status === 'success'" class="auth-kit-success">Password reset.</p>
    </form>
  `,
})
export class ResetPasswordFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input({ required: true }) token!: string;
  @Input() passwordPolicy?: PasswordPolicy;

  newPassword = '';
  confirmPassword = '';
  showPassword = false;
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
    const result = buildResetPasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({ newPassword: this.newPassword, confirmPassword: this.confirmPassword });
    const message = extractFieldError(result, key);
    if (message) {
      this.fieldErrors = { ...this.fieldErrors, [key]: message };
    } else {
      this.clearError(key);
    }
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    const result = buildResetPasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    });
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit.resetPassword({ token: this.token, newPassword: this.newPassword }).catch(() => {});
  }
}
