import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildChangePasswordSchema, extractFieldError } from '../../core/validation.js';

import type { AuthKitService } from '../../adapters/angular/auth-kit.service.js';
import type { PasswordPolicy } from '../../core/validation.js';

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
@Component({
  selector: 'auth-kit-change-password-form',
  standalone: true,
  imports: [NgIf],
  template: `
    <form novalidate (submit)="handleSubmit($event)">
      <div>
        <label for="auth-kit-change-current">Contraseña actual</label>
        <input
          id="auth-kit-change-current"
          [type]="showCurrent ? 'text' : 'password'"
          autocomplete="current-password"
          [value]="currentPassword"
          (input)="currentPassword = $any($event.target).value; clearError('currentPassword')"
          (blur)="validateField('currentPassword')"
        />
        <button type="button" (click)="showCurrent = !showCurrent">
          {{ showCurrent ? 'Ocultar' : 'Mostrar' }}
        </button>
        <p *ngIf="fieldErrors['currentPassword']" role="alert">
          {{ fieldErrors['currentPassword'] }}
        </p>
      </div>
      <div>
        <label for="auth-kit-change-new">Contraseña nueva</label>
        <input
          id="auth-kit-change-new"
          [type]="showNew ? 'text' : 'password'"
          autocomplete="new-password"
          [value]="newPassword"
          (input)="newPassword = $any($event.target).value; clearError('newPassword')"
          (blur)="validateField('newPassword')"
        />
        <button type="button" (click)="showNew = !showNew">
          {{ showNew ? 'Ocultar' : 'Mostrar' }}
        </button>
        <p *ngIf="fieldErrors['newPassword']" role="alert">{{ fieldErrors['newPassword'] }}</p>
      </div>
      <div>
        <label for="auth-kit-change-confirm">Confirmar contraseña nueva</label>
        <input
          id="auth-kit-change-confirm"
          [type]="showNew ? 'text' : 'password'"
          autocomplete="new-password"
          [value]="confirmPassword"
          (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')"
          (blur)="validateField('confirmPassword')"
        />
        <p *ngIf="fieldErrors['confirmPassword']" role="alert">
          {{ fieldErrors['confirmPassword'] }}
        </p>
      </div>
      <button type="submit" [disabled]="authKit.state().changePassword.status === 'submitting'">
        {{
          authKit.state().changePassword.status === 'submitting'
            ? 'Actualizando…'
            : 'Actualizar contraseña'
        }}
      </button>
      <p
        *ngIf="
          authKit.state().changePassword.status === 'error' && authKit.state().changePassword.error
        "
        role="alert"
      >
        {{ authKit.state().changePassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().changePassword.status === 'success'">Contraseña actualizada.</p>
    </form>
  `,
})
export class ChangePasswordFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() passwordPolicy?: PasswordPolicy;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrent = false;
  showNew = false;
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
    const result = buildChangePasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({
      currentPassword: this.currentPassword,
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
    const result = buildChangePasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({
      currentPassword: this.currentPassword,
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
      .changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword })
      .catch(() => {});
  }
}
