import { NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { resolveFieldConfig } from '../../../core/field-config.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';
import { TurnstileWidgetComponent } from '../turnstile-widget.component.js';

import type { ResolvedFieldConfig, AuthKitFieldConfig } from '../../../core/field-config.js';
import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { PasswordPolicy } from '../../../core/validation.js';

const INPUT_CLASS =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const EYE_BUTTON_CLASS =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
const EYE_PATH = 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z';
const EYE_OFF_PATH =
  'M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
@Component({
  selector: 'auth-kit-register-form',
  standalone: true,
  imports: [NgIf, NgFor, TurnstileWidgetComponent],
  template: `
    <form novalidate class="flex flex-col gap-3" (submit)="handleSubmit($event)">
      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-email">
        Email
        <input id="auth-kit-register-email" type="email" autocomplete="email" [class]="inputClass" [value]="email" (input)="email = $any($event.target).value; clearError('email')" (blur)="validateField('email')" />
      </label>
      <p *ngIf="fieldErrors['email']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['email'] }}</p>

      <label *ngIf="fields.firstName.enabled" class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-firstname">
        {{ fields.firstName.label }}
        <input id="auth-kit-register-firstname" type="text" [class]="inputClass" [value]="firstName" (input)="firstName = $any($event.target).value; clearError('firstName')" (blur)="validateField('firstName')" />
      </label>
      <p *ngIf="fieldErrors['firstName']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['firstName'] }}</p>

      <label *ngIf="fields.lastName.enabled" class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-lastname">
        {{ fields.lastName.label }}
        <input id="auth-kit-register-lastname" type="text" [class]="inputClass" [value]="lastName" (input)="lastName = $any($event.target).value; clearError('lastName')" (blur)="validateField('lastName')" />
      </label>
      <p *ngIf="fieldErrors['lastName']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['lastName'] }}</p>

      <label *ngIf="fields.phone.enabled" class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-phone">
        {{ fields.phone.label }}
        <input id="auth-kit-register-phone" type="tel" [class]="inputClass" [value]="phone" (input)="phone = $any($event.target).value; clearError('phone')" (blur)="validateField('phone')" />
      </label>
      <p *ngIf="fieldErrors['phone']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['phone'] }}</p>

      <label *ngIf="fields.profileType.enabled" class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-profile-type">
        {{ fields.profileType.label }}
        <select id="auth-kit-register-profile-type" [class]="inputClass + ' dark:[color-scheme:dark]'" [value]="profileType" (change)="profileType = $any($event.target).value">
          <option *ngFor="let option of fields.profileType.options" [value]="option.value">{{ option.label }}</option>
        </select>
      </label>

      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-password">
        Password
        <div class="relative">
          <input
            id="auth-kit-register-password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            [class]="inputClass + ' pr-9'"
            [value]="password"
            (input)="password = $any($event.target).value; clearError('password')" (blur)="validateField('password')"
          />
          <button type="button" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'" [class]="eyeButtonClass" (click)="showPassword = !showPassword">
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
      </label>
      <p *ngIf="fieldErrors['password']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['password'] }}</p>

      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-confirm-password">
        Confirm password
        <div class="relative">
          <input
            id="auth-kit-register-confirm-password"
            [type]="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            [class]="inputClass + ' pr-9'"
            [value]="confirmPassword"
            (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')" (blur)="validateField('confirmPassword')"
          />
          <button type="button" [attr.aria-label]="showConfirm ? 'Hide password' : 'Show password'" [class]="eyeButtonClass" (click)="showConfirm = !showConfirm">
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
      </label>
      <p *ngIf="fieldErrors['confirmPassword']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['confirmPassword'] }}</p>

      <div *ngIf="fields.legalConsent.enabled">
        <label class="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-register-terms">
          <input id="auth-kit-register-terms" type="checkbox" class="mt-0.5" [checked]="termsAccepted" (change)="termsAccepted = $any($event.target).checked; clearError('termsAccepted')" />
          <span>
            {{ fields.legalConsent.text }}
            <span *ngFor="let link of fields.legalConsent.links; let i = index">
              {{ i > 0 ? ' ' : '' }}<a [href]="link.href" target="_blank" rel="noreferrer" class="font-medium text-zinc-900 hover:underline dark:text-zinc-100">{{ link.label }}</a>
            </span>
          </span>
        </label>
        <p *ngIf="fieldErrors['termsAccepted']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['termsAccepted'] }}</p>
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
        class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {{ authKit.state().register.status === 'submitting' ? 'Creating account…' : 'Create account' }}
      </button>
      <p *ngIf="authKit.state().register.status === 'error' && authKit.state().register.error" class="text-sm text-red-600 dark:text-red-400">
        {{ authKit.state().register.error?.message }}
      </p>
      <p *ngIf="authKit.state().register.status === 'success'" class="text-sm text-green-600 dark:text-green-400">Account created.</p>

      <p *ngIf="onNavigateToLogin" class="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?
        <button
          type="button"
          class="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          (click)="onNavigateToLogin()"
        >
          Sign in
        </button>
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
  readonly eyeButtonClass = EYE_BUTTON_CLASS;
  readonly eyePath = EYE_PATH;
  readonly eyeOffPath = EYE_OFF_PATH;

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
