import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildResetPasswordSchema, extractFieldError } from '../../core/validation.js';

import type { AuthKitService } from '../../adapters/angular/auth-kit.service.js';
import type { PasswordPolicy } from '../../core/validation.js';

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
@Component({
  selector: 'auth-kit-reset-password-form',
  standalone: true,
  imports: [NgIf],
  template: `
    <form novalidate (submit)="handleSubmit($event)">
      <div>
        <label for="auth-kit-reset-new">Contraseña nueva</label>
        <input
          id="auth-kit-reset-new"
          [type]="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          [value]="newPassword"
          (input)="newPassword = $any($event.target).value; clearError('newPassword')"
          (blur)="validateField('newPassword')"
        />
        <button type="button" (click)="showPassword = !showPassword">
          {{ showPassword ? 'Ocultar' : 'Mostrar' }}
        </button>
        <p *ngIf="fieldErrors['newPassword']" role="alert">{{ fieldErrors['newPassword'] }}</p>
      </div>
      <div>
        <label for="auth-kit-reset-confirm">Confirmar contraseña nueva</label>
        <input
          id="auth-kit-reset-confirm"
          [type]="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          [value]="confirmPassword"
          (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')"
          (blur)="validateField('confirmPassword')"
        />
        <p *ngIf="fieldErrors['confirmPassword']" role="alert">
          {{ fieldErrors['confirmPassword'] }}
        </p>
      </div>
      <button type="submit" [disabled]="authKit.state().resetPassword.status === 'submitting'">
        {{
          authKit.state().resetPassword.status === 'submitting'
            ? 'Restableciendo…'
            : 'Restablecer contraseña'
        }}
      </button>
      <p
        *ngIf="
          authKit.state().resetPassword.status === 'error' && authKit.state().resetPassword.error
        "
        role="alert"
      >
        {{ authKit.state().resetPassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().resetPassword.status === 'success'">Contraseña restablecida.</p>
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
    const result = buildResetPasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    });
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
      this.fieldErrors = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .resetPassword({ token: this.token, newPassword: this.newPassword })
      .catch(() => {});
  }
}
