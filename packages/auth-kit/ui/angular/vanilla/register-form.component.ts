import { NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { resolveFieldConfig } from '../../../core/field-config.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { ResolvedFieldConfig, AuthKitFieldConfig } from '../../../core/field-config.js';
import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { PasswordPolicy } from '../../../core/validation.js';

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
@Component({
  selector: 'auth-kit-register-form',
  standalone: true,
  imports: [NgIf, NgFor, TurnstileWidgetComponent],
  template: `
    <form novalidate class="auth-kit-form" (submit)="handleSubmit($event)">
      <label class="auth-kit-field" for="auth-kit-register-email">
        Correo electrónico
        <input id="auth-kit-register-email" type="email" autocomplete="email" class="auth-kit-input" [value]="email" (input)="email = $any($event.target).value; clearError('email')" (blur)="validateField('email')" />
      </label>
      <p *ngIf="fieldErrors['email']" class="auth-kit-error">{{ fieldErrors['email'] }}</p>

      <label *ngIf="fields.firstName.enabled" class="auth-kit-field" for="auth-kit-register-firstname">
        {{ fields.firstName.label }}
        <input id="auth-kit-register-firstname" type="text" class="auth-kit-input" [value]="firstName" (input)="firstName = $any($event.target).value; clearError('firstName')" (blur)="validateField('firstName')" />
      </label>
      <p *ngIf="fieldErrors['firstName']" class="auth-kit-error">{{ fieldErrors['firstName'] }}</p>

      <label *ngIf="fields.lastName.enabled" class="auth-kit-field" for="auth-kit-register-lastname">
        {{ fields.lastName.label }}
        <input id="auth-kit-register-lastname" type="text" class="auth-kit-input" [value]="lastName" (input)="lastName = $any($event.target).value; clearError('lastName')" (blur)="validateField('lastName')" />
      </label>
      <p *ngIf="fieldErrors['lastName']" class="auth-kit-error">{{ fieldErrors['lastName'] }}</p>

      <label *ngIf="fields.phone.enabled" class="auth-kit-field" for="auth-kit-register-phone">
        {{ fields.phone.label }}
        <input id="auth-kit-register-phone" type="tel" class="auth-kit-input" [value]="phone" (input)="phone = $any($event.target).value; clearError('phone')" (blur)="validateField('phone')" />
      </label>
      <p *ngIf="fieldErrors['phone']" class="auth-kit-error">{{ fieldErrors['phone'] }}</p>

      <label *ngIf="fields.profileType.enabled" class="auth-kit-field" for="auth-kit-register-profile-type">
        {{ fields.profileType.label }}
        <select id="auth-kit-register-profile-type" class="auth-kit-select" [value]="profileType" (change)="profileType = $any($event.target).value">
          <option *ngFor="let option of fields.profileType.options" [value]="option.value">{{ option.label }}</option>
        </select>
      </label>

      <label class="auth-kit-field" for="auth-kit-register-password">
        Contraseña
        <span class="auth-kit-field__row">
          <input
            id="auth-kit-register-password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            class="auth-kit-input"
            [value]="password"
            (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
          />
          <button type="button" class="auth-kit-button auth-kit-button--ghost" (click)="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
        </span>
      </label>
      <p *ngIf="fieldErrors['password']" class="auth-kit-error">{{ fieldErrors['password'] }}</p>

      <label class="auth-kit-field" for="auth-kit-register-confirm-password">
        Confirmar contraseña
        <span class="auth-kit-field__row">
          <input
            id="auth-kit-register-confirm-password"
            [type]="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            class="auth-kit-input"
            [value]="confirmPassword"
            (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')" (blur)="validateField('confirmPassword')"
          />
          <button type="button" class="auth-kit-button auth-kit-button--ghost" (click)="showConfirm = !showConfirm">{{ showConfirm ? 'Ocultar' : 'Mostrar' }}</button>
        </span>
      </label>
      <p *ngIf="fieldErrors['confirmPassword']" class="auth-kit-error">{{ fieldErrors['confirmPassword'] }}</p>

      <div *ngIf="fields.legalConsent.enabled">
        <label class="auth-kit-checkbox-row" for="auth-kit-register-terms">
          <input id="auth-kit-register-terms" type="checkbox" [checked]="termsAccepted" (change)="termsAccepted = $any($event.target).checked; clearError('termsAccepted')" />
          <span>
            {{ fields.legalConsent.text }}
            <span *ngFor="let link of fields.legalConsent.links; let i = index">
              {{ i > 0 ? ' ' : '' }}<a [href]="link.href" target="_blank" rel="noreferrer">{{ link.label }}</a>
            </span>
          </span>
        </label>
        <p *ngIf="fieldErrors['termsAccepted']" class="auth-kit-error">{{ fieldErrors['termsAccepted'] }}</p>
      </div>

      <auth-kit-turnstile-widget
        *ngIf="fields.turnstile.enabled"
        [siteKey]="fields.turnstile.siteKey"
        [theme]="fields.turnstile.theme"
        [mode]="fields.turnstile.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>

      <button type="submit" [disabled]="authKit.state().register.status === 'submitting'" class="auth-kit-button auth-kit-button--primary">
        {{ authKit.state().register.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
      <p *ngIf="authKit.state().register.status === 'error' && authKit.state().register.error" class="auth-kit-error">
        {{ authKit.state().register.error?.message }}
      </p>
      <p *ngIf="authKit.state().register.status === 'success'" class="auth-kit-success">Cuenta creada.</p>
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
