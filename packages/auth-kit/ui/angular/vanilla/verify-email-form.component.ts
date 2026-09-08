import { NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { buildResendVerificationSchema } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
@Component({
  selector: 'auth-kit-verify-email-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <div>
      <div *ngIf="token" role="status" class="auth-kit-status">
        <p *ngIf="authKit.state().verifyEmail.status === 'submitting'">Verificando tu email…</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'success'" class="auth-kit-success">
          Tu email está verificado.
        </p>
        <p
          *ngIf="
            authKit.state().verifyEmail.status === 'error' && authKit.state().verifyEmail.error
          "
          class="auth-kit-error"
        >
          {{ authKit.state().verifyEmail.error?.message }}
        </p>
      </div>

      <form novalidate class="auth-kit-form" (submit)="handleResendSubmit($event)">
        <label class="auth-kit-field" for="auth-kit-resend-email">
          Correo electrónico
          <input
            id="auth-kit-resend-email"
            type="email"
            autocomplete="email"
            class="auth-kit-input"
            [value]="resendEmail"
            (input)="resendEmail = $any($event.target).value"
          />
        </label>
        <p *ngIf="fieldErrors['email']" class="auth-kit-error">{{ fieldErrors['email'] }}</p>
        <auth-kit-turnstile-widget
          *ngIf="turnstile?.enabled"
          [siteKey]="turnstile?.siteKey"
          [theme]="turnstile?.theme"
          [mode]="turnstile?.mode"
          (token)="turnstileToken = $event"
        ></auth-kit-turnstile-widget>
        <button
          type="submit"
          [disabled]="authKit.state().resendVerification.status === 'submitting'"
          class="auth-kit-button"
        >
          {{
            authKit.state().resendVerification.status === 'submitting'
              ? 'Enviando…'
              : 'Reenviar email de verificación'
          }}
        </button>
        <p
          *ngIf="
            authKit.state().resendVerification.status === 'error' &&
            authKit.state().resendVerification.error
          "
          class="auth-kit-error"
        >
          {{ authKit.state().resendVerification.error?.message }}
        </p>
        <p *ngIf="authKit.state().resendVerification.status === 'success'" class="auth-kit-success">
          Email de verificación enviado.
        </p>
      </form>
    </div>
  `,
})
export class VerifyEmailFormComponent implements OnChanges {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() token?: string;
  @Input() email?: string;
  @Input() turnstile?: TurnstileFieldConfig;

  turnstileToken: string | null = null;
  fieldErrors: Record<string, string> = {};
  resendEmail = '';
  private verifyAttempted = false;
  private emailInitialized = false;

  ngOnChanges(): void {
    if (!this.emailInitialized) {
      this.emailInitialized = true;
      this.resendEmail = this.email ?? '';
    }
    if (this.token && !this.verifyAttempted) {
      this.verifyAttempted = true;
      void this.authKit.verifyEmail({ token: this.token }).catch(() => {});
    }
  }

  handleResendSubmit(event: Event): void {
    event.preventDefault();
    const result = buildResendVerificationSchema().safeParse({ email: this.resendEmail });
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .resendVerification({ email: this.resendEmail, turnstileToken: this.turnstileToken })
      .catch(() => {});
  }
}
