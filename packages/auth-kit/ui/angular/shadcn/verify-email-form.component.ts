import { NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { buildResendVerificationSchema } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. */
@Component({
  selector: 'auth-kit-verify-email-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div *ngIf="token" role="status" class="text-sm">
        <p *ngIf="authKit.state().verifyEmail.status === 'submitting'" class="text-muted-foreground">Verificando tu email…</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'success'" class="text-green-600">Tu email está verificado.</p>
        <p *ngIf="authKit.state().verifyEmail.status === 'error' && authKit.state().verifyEmail.error" class="text-destructive">
          {{ authKit.state().verifyEmail.error?.message }}
        </p>
      </div>

      <form novalidate class="flex flex-col gap-4" (submit)="handleResendSubmit($event)">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium leading-none" for="auth-kit-resend-email">Correo electrónico</label>
          <input id="auth-kit-resend-email" type="email" autocomplete="email" [class]="inputClass" [value]="resendEmail" (input)="resendEmail = $any($event.target).value" />
          <p *ngIf="fieldErrors['email']" class="text-sm text-destructive">{{ fieldErrors['email'] }}</p>
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
          [disabled]="authKit.state().resendVerification.status === 'submitting'"
          class="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
        >
          {{ authKit.state().resendVerification.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación' }}
        </button>
        <p *ngIf="authKit.state().resendVerification.status === 'error' && authKit.state().resendVerification.error" class="text-sm text-destructive">
          {{ authKit.state().resendVerification.error?.message }}
        </p>
        <p *ngIf="authKit.state().resendVerification.status === 'success'" class="text-sm text-green-600">Email de verificación enviado.</p>
      </form>
    </div>
  `,
})
export class VerifyEmailFormComponent implements OnChanges {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() token?: string;
  @Input() email?: string;
  @Input() turnstile?: TurnstileFieldConfig;

  readonly inputClass = INPUT_CLASS;

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
