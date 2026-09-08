import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LINK_CLASS =
  'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. */
@Component({
  selector: 'auth-kit-forgot-password-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate class="flex flex-col gap-4" (submit)="handleSubmit($event)">
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-forgot-email"
          >Correo electrónico</label
        >
        <input
          id="auth-kit-forgot-email"
          type="email"
          autocomplete="email"
          [class]="inputClass"
          [value]="email"
          (input)="email = $any($event.target).value; clearError('email')"
          (blur)="validateField('email')"
        />
        <p *ngIf="fieldErrors['email']" class="text-sm text-destructive">
          {{ fieldErrors['email'] }}
        </p>
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
        [disabled]="authKit.state().forgotPassword.status === 'submitting'"
        class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {{ authKit.state().forgotPassword.status === 'submitting' ? 'Enviando…' : 'Enviar enlace' }}
      </button>
      <p
        *ngIf="
          authKit.state().forgotPassword.status === 'error' && authKit.state().forgotPassword.error
        "
        class="text-sm text-destructive"
      >
        {{ authKit.state().forgotPassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().forgotPassword.status === 'success'" class="text-sm text-green-600">
        Revisa tu correo para ver el enlace de restablecimiento.
      </p>

      <p *ngIf="onNavigateToLogin" class="text-center text-sm text-muted-foreground">
        ¿Recordaste tu contraseña?
        <button type="button" [class]="linkClass" (click)="onNavigateToLogin()">
          Iniciar sesión
        </button>
      </p>
    </form>
  `,
})
export class ForgotPasswordFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  @Input() onNavigateToLogin?: () => void;

  readonly inputClass = INPUT_CLASS;
  readonly linkClass = LINK_CLASS;

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
