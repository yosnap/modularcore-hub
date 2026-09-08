import { NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { buildResendVerificationSchema } from '../../core/validation.js';
import { TurnstileWidgetComponent } from './turnstile-widget.component.js';

import type { AuthKitService } from '../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
@Component({
  selector: 'auth-kit-verify-email-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <div>
      <div *ngIf="token" role="status">
        <p *ngIf="authKit.state().verifyEmail.status === 'submitting'">Verificando tu email…</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'success'">Tu email está verificado.</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'error' && authKit.state().verifyEmail.error" role="alert">
          {{ authKit.state().verifyEmail.error?.message }}
        </p>
      </div>

      <form novalidate (submit)="handleResendSubmit($event)">
        <div>
          <label for="auth-kit-resend-email">Correo electrónico</label>
          <input id="auth-kit-resend-email" type="email" autocomplete="email" [value]="resendEmail" (input)="resendEmail = $any($event.target).value" />
          <p *ngIf="fieldErrors['email']" role="alert">{{ fieldErrors['email'] }}</p>
        </div>
        <auth-kit-turnstile-widget
          *ngIf="turnstile?.enabled"
          [siteKey]="turnstile?.siteKey"
          [theme]="turnstile?.theme"
          [mode]="turnstile?.mode"
          (token)="turnstileToken = $event"
        ></auth-kit-turnstile-widget>
        <button type="submit" [disabled]="authKit.state().resendVerification.status === 'submitting'">
          {{ authKit.state().resendVerification.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación' }}
        </button>
        <p *ngIf="authKit.state().resendVerification.status === 'error' && authKit.state().resendVerification.error" role="alert">
          {{ authKit.state().resendVerification.error?.message }}
        </p>
        <p *ngIf="authKit.state().resendVerification.status === 'success'">Email de verificación enviado.</p>
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
  /** Editable copy of the `email` input — kept separate so the user's typing doesn't fight `@Input()` change detection. */
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
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit.resendVerification({ email: this.resendEmail, turnstileToken: this.turnstileToken }).catch(() => {});
  }
}
