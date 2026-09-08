import { NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { resolveFieldConfig } from '../../core/field-config.js';
import { buildRegisterSchema, extractFieldError } from '../../core/validation.js';
import { TurnstileWidgetComponent } from './turnstile-widget.component.js';

import type { ResolvedFieldConfig, AuthKitFieldConfig } from '../../core/field-config.js';
import type { AuthKitService } from '../../adapters/angular/auth-kit.service.js';
import type { PasswordPolicy } from '../../core/validation.js';

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
@Component({
  selector: 'auth-kit-register-form',
  standalone: true,
  imports: [NgIf, NgFor, TurnstileWidgetComponent],
  template: `
    <form novalidate (submit)="handleSubmit($event)">
      <div>
        <label for="auth-kit-register-email">Correo electrónico</label>
        <input id="auth-kit-register-email" type="email" autocomplete="email" [value]="email" (input)="email = $any($event.target).value; clearError('email')" (blur)="validateField('email')" />
        <p *ngIf="fieldErrors['email']" role="alert">{{ fieldErrors['email'] }}</p>
      </div>

      <div *ngIf="fields.firstName.enabled">
        <label for="auth-kit-register-firstname">{{ fields.firstName.label }}</label>
        <input id="auth-kit-register-firstname" type="text" [value]="firstName" (input)="firstName = $any($event.target).value; clearError('firstName')" (blur)="validateField('firstName')" />
        <p *ngIf="fieldErrors['firstName']" role="alert">{{ fieldErrors['firstName'] }}</p>
      </div>

      <div *ngIf="fields.lastName.enabled">
        <label for="auth-kit-register-lastname">{{ fields.lastName.label }}</label>
        <input id="auth-kit-register-lastname" type="text" [value]="lastName" (input)="lastName = $any($event.target).value; clearError('lastName')" (blur)="validateField('lastName')" />
        <p *ngIf="fieldErrors['lastName']" role="alert">{{ fieldErrors['lastName'] }}</p>
      </div>

      <div *ngIf="fields.phone.enabled">
        <label for="auth-kit-register-phone">{{ fields.phone.label }}</label>
        <input id="auth-kit-register-phone" type="tel" [value]="phone" (input)="phone = $any($event.target).value; clearError('phone')" (blur)="validateField('phone')" />
        <p *ngIf="fieldErrors['phone']" role="alert">{{ fieldErrors['phone'] }}</p>
      </div>

      <div *ngIf="fields.profileType.enabled">
        <label for="auth-kit-register-profile-type">{{ fields.profileType.label }}</label>
        <select id="auth-kit-register-profile-type" [value]="profileType" (change)="profileType = $any($event.target).value">
          <option *ngFor="let option of fields.profileType.options" [value]="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div>
        <label for="auth-kit-register-password">Contraseña</label>
        <input
          id="auth-kit-register-password"
          [type]="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          [value]="password"
          (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
        />
        <button type="button" (click)="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
        <p *ngIf="fieldErrors['password']" role="alert">{{ fieldErrors['password'] }}</p>
      </div>

      <div>
        <label for="auth-kit-register-confirm-password">Confirmar contraseña</label>
        <input
          id="auth-kit-register-confirm-password"
          [type]="showConfirm ? 'text' : 'password'"
          autocomplete="new-password"
          [value]="confirmPassword"
          (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')" (blur)="validateField('confirmPassword')"
        />
        <button type="button" (click)="showConfirm = !showConfirm">{{ showConfirm ? 'Ocultar' : 'Mostrar' }}</button>
        <p *ngIf="fieldErrors['confirmPassword']" role="alert">{{ fieldErrors['confirmPassword'] }}</p>
      </div>

      <div *ngIf="fields.legalConsent.enabled">
        <label for="auth-kit-register-terms">
          <input
            id="auth-kit-register-terms"
            type="checkbox"
            [checked]="termsAccepted"
            (change)="termsAccepted = $any($event.target).checked; clearError('termsAccepted')"
          />
          {{ fields.legalConsent.text }}
          <span *ngFor="let link of fields.legalConsent.links; let i = index">
            {{ i > 0 ? ' ' : '' }}<a [href]="link.href" target="_blank" rel="noreferrer">{{ link.label }}</a>
          </span>
        </label>
        <p *ngIf="fieldErrors['termsAccepted']" role="alert">{{ fieldErrors['termsAccepted'] }}</p>
      </div>

      <auth-kit-turnstile-widget
        *ngIf="fields.turnstile.enabled"
        [siteKey]="fields.turnstile.siteKey"
        [theme]="fields.turnstile.theme"
        [mode]="fields.turnstile.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>

      <button type="submit" [disabled]="authKit.state().register.status === 'submitting'">
        {{ authKit.state().register.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
      <p *ngIf="authKit.state().register.status === 'error' && authKit.state().register.error" role="alert">
        {{ authKit.state().register.error?.message }}
      </p>
      <p *ngIf="authKit.state().register.status === 'success'">Cuenta creada.</p>
    </form>
  `,
})
export class RegisterFormComponent implements OnChanges {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() fieldConfig?: AuthKitFieldConfig;
  @Input() passwordPolicy?: PasswordPolicy;

  fields: ResolvedFieldConfig = resolveFieldConfig();

  email = '';
  password = '';
  confirmPassword = '';
  firstName = '';
  lastName = '';
  phone = '';
  profileType = '';
  termsAccepted = false;
  showPassword = false;
  showConfirm = false;
  turnstileToken: string | null = null;
  fieldErrors: Record<string, string> = {};

  ngOnChanges(): void {
    this.fields = resolveFieldConfig(this.fieldConfig);
    if (!this.profileType) this.profileType = this.fields.profileType.defaultValue;
  }

  
  collectValues(): Record<string, unknown> {
    const f = this.fields;
    const values: Record<string, unknown> = { email: this.email, password: this.password, confirmPassword: this.confirmPassword };
    if (f.firstName.enabled) values.firstName = this.firstName;
    if (f.lastName.enabled) values.lastName = this.lastName;
    if (f.phone.enabled) values.phone = this.phone;
    if (f.profileType.enabled) values.profileType = this.profileType;
    if (f.legalConsent.enabled && f.legalConsent.required) values.termsAccepted = this.termsAccepted;
    return values;
  }

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
    const result = buildRegisterSchema(this.fields, { passwordPolicy: this.passwordPolicy }).safeParse(this.collectValues());
    const message = extractFieldError(result, key);
    if (message) {
      this.fieldErrors = { ...this.fieldErrors, [key]: message };
    } else {
      this.clearError(key);
    }
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    const f = this.fields;
    const values: Record<string, unknown> = { email: this.email, password: this.password, confirmPassword: this.confirmPassword };
    if (f.firstName.enabled) values.firstName = this.firstName;
    if (f.lastName.enabled) values.lastName = this.lastName;
    if (f.phone.enabled) values.phone = this.phone;
    if (f.profileType.enabled) values.profileType = this.profileType;
    if (f.legalConsent.enabled && f.legalConsent.required) values.termsAccepted = this.termsAccepted;

    const result = buildRegisterSchema(f, { passwordPolicy: this.passwordPolicy }).safeParse(values);
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .register({
        email: this.email,
        password: this.password,
        firstName: f.firstName.enabled ? this.firstName : undefined,
        lastName: f.lastName.enabled ? this.lastName : undefined,
        phone: f.phone.enabled ? this.phone : undefined,
        profileType: f.profileType.enabled ? this.profileType : undefined,
        termsAccepted: f.legalConsent.enabled ? this.termsAccepted : undefined,
        turnstileToken: this.turnstileToken,
      })
      .catch(() => {});
  }
}
