import { NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { buildResendVerificationSchema } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
@Component({
  selector: 'auth-kit-verify-email-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div *ngIf="token" role="status" class="text-sm">
        <p *ngIf="authKit.state().verifyEmail.status === 'submitting'" class="text-zinc-700">Verifying your email…</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'success'" class="text-green-600">Your email is verified.</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'error' && authKit.state().verifyEmail.error" class="text-red-600">
          {{ authKit.state().verifyEmail.error?.message }}
        </p>
      </div>

      <form novalidate class="flex flex-col gap-3" (submit)="handleResendSubmit($event)">
        <label class="flex flex-col gap-1 text-sm text-zinc-700" for="auth-kit-resend-email">
          Email
          <input id="auth-kit-resend-email" type="email" autocomplete="email" class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" [value]="resendEmail" (input)="resendEmail = $any($event.target).value" />
        </label>
        <p *ngIf="fieldErrors['email']" class="text-sm text-red-600">{{ fieldErrors['email'] }}</p>
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
          class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {{ authKit.state().resendVerification.status === 'submitting' ? 'Sending…' : 'Resend verification email' }}
        </button>
        <p *ngIf="authKit.state().resendVerification.status === 'error' && authKit.state().resendVerification.error" class="text-sm text-red-600">
          {{ authKit.state().resendVerification.error?.message }}
        </p>
        <p *ngIf="authKit.state().resendVerification.status === 'success'" class="text-sm text-green-600">Verification email sent.</p>
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
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit.resendVerification({ email: this.resendEmail, turnstileToken: this.turnstileToken }).catch(() => {});
  }
}
