import { NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { resolveFieldConfig } from '../../../core/field-config.js';
import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { ResolvedFieldConfig, AuthKitFieldConfig } from '../../../core/field-config.js';
import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { PasswordStrength } from '../../../core/password-strength.js';
import type { PasswordPolicy } from '../../../core/validation.js';

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LINK_CLASS = 'text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline';
const EYE_PATH = 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z';
const EYE_OFF_PATH =
  'M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24';
const CHECK_PATH = 'M3 8.5l3 3 7-7';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. */
@Component({
  selector: 'auth-kit-register-form',
  standalone: true,
  imports: [NgIf, NgFor, TurnstileWidgetComponent],
  template: `
    <form novalidate class="flex flex-col gap-4" (submit)="handleSubmit($event)">
      <div *ngIf="fields.profileType.enabled" class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="tablist" [attr.aria-label]="fields.profileType.label">
        <button
          *ngFor="let option of fields.profileType.options"
          type="button"
          role="tab"
          [attr.aria-selected]="profileType === option.value"
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
          [class]="profileType === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
          (click)="profileType = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-register-email">Correo electrónico</label>
        <input id="auth-kit-register-email" type="email" autocomplete="email" [class]="inputClass" [value]="email" (input)="email = $any($event.target).value; clearError('email')" (blur)="validateField('email')" />
        <p *ngIf="fieldErrors['email']" class="text-sm text-destructive">{{ fieldErrors['email'] }}</p>
      </div>

      <div *ngIf="fields.firstName.enabled" class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-register-firstname">{{ fields.firstName.label }}</label>
        <input id="auth-kit-register-firstname" type="text" [class]="inputClass" [value]="firstName" (input)="firstName = $any($event.target).value; clearError('firstName')" (blur)="validateField('firstName')" />
        <p *ngIf="fieldErrors['firstName']" class="text-sm text-destructive">{{ fieldErrors['firstName'] }}</p>
      </div>

      <div *ngIf="fields.lastName.enabled" class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-register-lastname">{{ fields.lastName.label }}</label>
        <input id="auth-kit-register-lastname" type="text" [class]="inputClass" [value]="lastName" (input)="lastName = $any($event.target).value; clearError('lastName')" (blur)="validateField('lastName')" />
        <p *ngIf="fieldErrors['lastName']" class="text-sm text-destructive">{{ fieldErrors['lastName'] }}</p>
      </div>

      <div *ngIf="fields.phone.enabled" class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-register-phone">{{ fields.phone.label }}</label>
        <input id="auth-kit-register-phone" type="tel" [class]="inputClass" [value]="phone" (input)="phone = $any($event.target).value; clearError('phone')" (blur)="validateField('phone')" />
        <p *ngIf="fieldErrors['phone']" class="text-sm text-destructive">{{ fieldErrors['phone'] }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-register-password">Contraseña</label>
        <div class="relative">
          <input
            id="auth-kit-register-password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            [class]="inputClass + ' pr-9'"
            [value]="password"
            (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
          />
          <button
            type="button"
            [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
            (click)="showPassword = !showPassword"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <ng-container *ngIf="showPassword; else eyeOpenReg">
                <path [attr.d]="eyeOffPath" />
                <path d="M1 1l22 22" />
              </ng-container>
              <ng-template #eyeOpenReg>
                <path [attr.d]="eyePath" />
                <circle cx="12" cy="12" r="3" />
              </ng-template>
            </svg>
          </button>
        </div>
        <div *ngIf="password.length > 0" class="flex flex-col gap-1.5">
          <div class="flex gap-1">
            <span
              *ngFor="let requirement of strength.requirements; let i = index"
              class="h-1 flex-1 rounded-full"
              [class]="strengthBarClass(i)"
            ></span>
          </div>
          <ul class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            <li
              *ngFor="let requirement of strength.requirements"
              class="flex items-center gap-1"
              [class]="requirement.met ? 'text-green-600' : 'text-muted-foreground'"
            >
              <svg *ngIf="requirement.met" viewBox="0 0 11 11" class="h-3 w-3">
                <path [attr.d]="checkPath" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </svg>
              <span *ngIf="!requirement.met" class="inline-block h-3 w-3" aria-hidden="true">·</span>
              {{ requirement.label }}
            </li>
          </ul>
        </div>
        <p *ngIf="fieldErrors['password']" class="text-sm text-destructive">{{ fieldErrors['password'] }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-register-confirm-password">Confirmar contraseña</label>
        <div class="relative">
          <input
            id="auth-kit-register-confirm-password"
            [type]="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            [class]="inputClass + ' pr-9'"
            [value]="confirmPassword"
            (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')" (blur)="validateField('confirmPassword')"
          />
          <button
            type="button"
            [attr.aria-label]="showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
            (click)="showConfirm = !showConfirm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <ng-container *ngIf="showConfirm; else eyeOpenConfirm">
                <path [attr.d]="eyeOffPath" />
                <path d="M1 1l22 22" />
              </ng-container>
              <ng-template #eyeOpenConfirm>
                <path [attr.d]="eyePath" />
                <circle cx="12" cy="12" r="3" />
              </ng-template>
            </svg>
          </button>
        </div>
        <p *ngIf="fieldErrors['confirmPassword']" class="text-sm text-destructive">{{ fieldErrors['confirmPassword'] }}</p>
      </div>

      <div *ngIf="fields.legalConsent.enabled">
        <div class="flex items-start gap-2">
          <input
            id="auth-kit-register-terms"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-primary"
            [checked]="termsAccepted"
            (change)="termsAccepted = $any($event.target).checked; clearError('termsAccepted')"
          />
          <label for="auth-kit-register-terms" class="text-sm text-muted-foreground">
            {{ fields.legalConsent.text }}
            <span *ngFor="let link of fields.legalConsent.links; let i = index">
              {{ i > 0 ? ' ' : '' }}<a [href]="link.href" target="_blank" rel="noreferrer" class="font-medium text-foreground hover:underline">{{ link.label }}</a>
            </span>
          </label>
        </div>
        <p *ngIf="fieldErrors['termsAccepted']" class="text-sm text-destructive">{{ fieldErrors['termsAccepted'] }}</p>
      </div>

      <auth-kit-turnstile-widget
        *ngIf="fields.turnstile.enabled"
        [siteKey]="fields.turnstile.siteKey"
        [theme]="fields.turnstile.theme"
        [mode]="fields.turnstile.mode"
        (token)="turnstileToken = $event"
      ></auth-kit-turnstile-widget>

      <button
        type="submit"
        [disabled]="authKit.state().register.status === 'submitting'"
        class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {{ authKit.state().register.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
      <p *ngIf="authKit.state().register.status === 'error' && authKit.state().register.error" class="text-sm text-destructive">
        {{ authKit.state().register.error?.message }}
      </p>
      <p *ngIf="authKit.state().register.status === 'success'" class="text-sm text-green-600">Cuenta creada.</p>

      <p *ngIf="onNavigateToLogin" class="text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta? <button type="button" [class]="linkClass" (click)="onNavigateToLogin()">Iniciar sesión</button>
      </p>
    </form>
  `,
})
export class RegisterFormComponent implements OnChanges {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() fieldConfig?: AuthKitFieldConfig;
  @Input() passwordPolicy?: PasswordPolicy;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  @Input() onNavigateToLogin?: () => void;

  readonly inputClass = INPUT_CLASS;
  readonly linkClass = LINK_CLASS;
  readonly eyePath = EYE_PATH;
  readonly eyeOffPath = EYE_OFF_PATH;
  readonly checkPath = CHECK_PATH;

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

  get strength(): PasswordStrength {
    return evaluatePasswordStrength(this.password, this.passwordPolicy);
  }

  strengthBarClass(index: number): string {
    const s = this.strength;
    if (index >= s.score) return 'bg-muted';
    if (s.score === s.total) return 'bg-green-500';
    if (s.score >= s.total - 1) return 'bg-yellow-500';
    return 'bg-destructive';
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
