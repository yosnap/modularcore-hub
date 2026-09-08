import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';

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
  selector: 'auth-kit-change-password-form',
  standalone: true,
  imports: [NgIf],
  template: `
    <form novalidate class="flex flex-col gap-3" (submit)="handleSubmit($event)">
      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-change-current">
        Current password
        <div class="relative">
          <input
            id="auth-kit-change-current"
            [type]="showCurrent ? 'text' : 'password'"
            autocomplete="current-password"
            [class]="inputClass + ' pr-9'"
            [value]="currentPassword"
            (input)="currentPassword = $any($event.target).value; clearError('currentPassword')" (blur)="validateField('currentPassword')"
          />
          <button type="button" [attr.aria-label]="showCurrent ? 'Hide password' : 'Show password'" [class]="eyeButtonClass" (click)="showCurrent = !showCurrent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <ng-container *ngIf="showCurrent; else eyeOpenCurrent">
                <path [attr.d]="eyeOffPath" />
                <path d="M1 1l22 22" />
              </ng-container>
              <ng-template #eyeOpenCurrent>
                <path [attr.d]="eyePath" />
                <circle cx="12" cy="12" r="3" />
              </ng-template>
            </svg>
          </button>
        </div>
      </label>
      <p *ngIf="fieldErrors['currentPassword']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['currentPassword'] }}</p>

      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-change-new">
        New password
        <div class="relative">
          <input
            id="auth-kit-change-new"
            [type]="showNew ? 'text' : 'password'"
            autocomplete="new-password"
            [class]="inputClass + ' pr-9'"
            [value]="newPassword"
            (input)="newPassword = $any($event.target).value; clearError('newPassword')" (blur)="validateField('newPassword')"
          />
          <button type="button" [attr.aria-label]="showNew ? 'Hide password' : 'Show password'" [class]="eyeButtonClass" (click)="showNew = !showNew">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <ng-container *ngIf="showNew; else eyeOpenNew">
                <path [attr.d]="eyeOffPath" />
                <path d="M1 1l22 22" />
              </ng-container>
              <ng-template #eyeOpenNew>
                <path [attr.d]="eyePath" />
                <circle cx="12" cy="12" r="3" />
              </ng-template>
            </svg>
          </button>
        </div>
      </label>
      <p *ngIf="fieldErrors['newPassword']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['newPassword'] }}</p>

      <label class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300" for="auth-kit-change-confirm">
        Confirm new password
        <input
          id="auth-kit-change-confirm"
          [type]="showNew ? 'text' : 'password'"
          autocomplete="new-password"
          [class]="inputClass"
          [value]="confirmPassword"
          (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')" (blur)="validateField('confirmPassword')"
        />
      </label>
      <p *ngIf="fieldErrors['confirmPassword']" class="text-sm text-red-600 dark:text-red-400">{{ fieldErrors['confirmPassword'] }}</p>

      <button
        type="submit"
        [disabled]="authKit.state().changePassword.status === 'submitting'"
        class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {{ authKit.state().changePassword.status === 'submitting' ? 'Updating…' : 'Update password' }}
      </button>
      <p *ngIf="authKit.state().changePassword.status === 'error' && authKit.state().changePassword.error" class="text-sm text-red-600 dark:text-red-400">
        {{ authKit.state().changePassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().changePassword.status === 'success'" class="text-sm text-green-600 dark:text-green-400">Password updated.</p>
    </form>
  `,
})
export class ChangePasswordFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() passwordPolicy?: PasswordPolicy;

  readonly inputClass = INPUT_CLASS;
  readonly eyeButtonClass = EYE_BUTTON_CLASS;
  readonly eyePath = EYE_PATH;
  readonly eyeOffPath = EYE_OFF_PATH;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrent = false;
  showNew = false;
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
    const result = buildChangePasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({ currentPassword: this.currentPassword, newPassword: this.newPassword, confirmPassword: this.confirmPassword });
    const message = extractFieldError(result, key);
    if (message) {
      this.fieldErrors = { ...this.fieldErrors, [key]: message };
    } else {
      this.clearError(key);
    }
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    const result = buildChangePasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    });
    if (!result.success) {
      this.fieldErrors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
      return;
    }
    this.fieldErrors = {};
    void this.authKit.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).catch(() => {});
  }
}
