import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildLoginSchema, extractFieldError } from '../../core/validation.js';
import { TurnstileWidgetComponent } from './turnstile-widget.component.js';

import type { AuthKitService } from '../../adapters/angular/auth-kit.service.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
@Component({
  selector: 'auth-kit-login-form',
  standalone: true,
  imports: [NgIf, TurnstileWidgetComponent],
  template: `
    <form novalidate (submit)="handleSubmit($event)">
      <div>
        <label for="auth-kit-login-identifier">Correo electrónico o nombre de usuario</label>
        <input
          id="auth-kit-login-identifier"
          type="text"
          autocomplete="username"
          [value]="identifier"
          (input)="identifier = $any($event.target).value; clearError('identifier')" (blur)="validateField('identifier')"
        />
        <p *ngIf="fieldErrors['identifier']" role="alert">{{ fieldErrors['identifier'] }}</p>
      </div>
      <div>
        <label for="auth-kit-login-password">Contraseña</label>
        <input
          id="auth-kit-login-password"
          [type]="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          [value]="password"
          (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
        />
        <button type="button" (click)="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
        <p *ngIf="fieldErrors['password']" role="alert">{{ fieldErrors['password'] }}</p>
      </div>
      <auth-kit-turnstile-widget
        *ngIf="turnstile?.enabled"
        [siteKey]="turnstile?.siteKey"
        [theme]="turnstile?.theme"
        [mode]="turnstile?.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>
      <button type="submit" [disabled]="authKit.state().login.status === 'submitting'">
        {{ authKit.state().login.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión' }}
      </button>
      <p *ngIf="authKit.state().login.status === 'error' && authKit.state().login.error" role="alert">
        {{ authKit.state().login.error?.message }}
      </p>
      <p *ngIf="authKit.state().login.status === 'success'">Sesión iniciada.</p>
    </form>
  `,
})
export class LoginFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() turnstile?: TurnstileFieldConfig;

  identifier = '';
  password = '';
  showPassword = false;
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
    const result = buildLoginSchema().safeParse({ identifier: this.identifier, password: this.password });
    const message = extractFieldError(result, key);
    if (message) {
      this.fieldErrors = { ...this.fieldErrors, [key]: message };
    } else {
      this.clearError(key);
    }
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    const result = buildLoginSchema().safeParse({ identifier: this.identifier, password: this.password });
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .login({ identifier: this.identifier, password: this.password, turnstileToken: this.turnstileToken })
      .catch(() => {});
  }
}
