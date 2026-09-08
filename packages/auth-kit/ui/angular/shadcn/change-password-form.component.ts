import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { AuthKitService } from '../../../adapters/angular/auth-kit.service.js';
import type { PasswordStrength } from '../../../core/password-strength.js';
import type { PasswordPolicy } from '../../../core/validation.js';

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const EYE_PATH = 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z';
const EYE_OFF_PATH =
  'M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 4.22-5.14M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24';
const CHECK_PATH = 'M3 8.5l3 3 7-7';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same props/behavior as headless. */
@Component({
  selector: 'auth-kit-change-password-form',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <form novalidate class="flex flex-col gap-4" (submit)="handleSubmit($event)">
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-change-current"
          >Contraseña actual</label
        >
        <div class="relative">
          <input
            id="auth-kit-change-current"
            [type]="showCurrent ? 'text' : 'password'"
            autocomplete="current-password"
            [class]="inputClass + ' pr-9'"
            [value]="currentPassword"
            (input)="currentPassword = $any($event.target).value; clearError('currentPassword')"
            (blur)="validateField('currentPassword')"
          />
          <button
            type="button"
            [attr.aria-label]="showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
            (click)="showCurrent = !showCurrent"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
            >
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
        <p *ngIf="fieldErrors['currentPassword']" class="text-sm text-destructive">
          {{ fieldErrors['currentPassword'] }}
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-change-new"
          >Contraseña nueva</label
        >
        <div class="relative">
          <input
            id="auth-kit-change-new"
            [type]="showNew ? 'text' : 'password'"
            autocomplete="new-password"
            [class]="inputClass + ' pr-9'"
            [value]="newPassword"
            (input)="newPassword = $any($event.target).value; clearError('newPassword')"
            (blur)="validateField('newPassword')"
          />
          <button
            type="button"
            [attr.aria-label]="showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            class="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
            (click)="showNew = !showNew"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
            >
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
        <div *ngIf="newPassword.length > 0" class="flex flex-col gap-1.5">
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
                <path
                  [attr.d]="checkPath"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                />
              </svg>
              <span *ngIf="!requirement.met" class="inline-block h-3 w-3" aria-hidden="true"
                >·</span
              >
              {{ requirement.label }}
            </li>
          </ul>
        </div>
        <p *ngIf="fieldErrors['newPassword']" class="text-sm text-destructive">
          {{ fieldErrors['newPassword'] }}
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium leading-none" for="auth-kit-change-confirm"
          >Confirmar contraseña nueva</label
        >
        <input
          id="auth-kit-change-confirm"
          [type]="showNew ? 'text' : 'password'"
          autocomplete="new-password"
          [class]="inputClass"
          [value]="confirmPassword"
          (input)="confirmPassword = $any($event.target).value; clearError('confirmPassword')"
          (blur)="validateField('confirmPassword')"
        />
        <p *ngIf="fieldErrors['confirmPassword']" class="text-sm text-destructive">
          {{ fieldErrors['confirmPassword'] }}
        </p>
      </div>

      <button
        type="submit"
        [disabled]="authKit.state().changePassword.status === 'submitting'"
        class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {{
          authKit.state().changePassword.status === 'submitting'
            ? 'Actualizando…'
            : 'Actualizar contraseña'
        }}
      </button>
      <p
        *ngIf="
          authKit.state().changePassword.status === 'error' && authKit.state().changePassword.error
        "
        class="text-sm text-destructive"
      >
        {{ authKit.state().changePassword.error?.message }}
      </p>
      <p *ngIf="authKit.state().changePassword.status === 'success'" class="text-sm text-green-600">
        Contraseña actualizada.
      </p>
    </form>
  `,
})
export class ChangePasswordFormComponent {
  @Input({ required: true }) authKit!: AuthKitService;
  @Input() passwordPolicy?: PasswordPolicy;

  readonly inputClass = INPUT_CLASS;
  readonly eyePath = EYE_PATH;
  readonly eyeOffPath = EYE_OFF_PATH;
  readonly checkPath = CHECK_PATH;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrent = false;
  showNew = false;
  fieldErrors: Record<string, string> = {};

  get strength(): PasswordStrength {
    return evaluatePasswordStrength(this.newPassword, this.passwordPolicy);
  }

  strengthBarClass(index: number): string {
    const s = this.strength;
    if (index >= s.score) return 'bg-muted';
    if (s.score === s.total) return 'bg-green-500';
    if (s.score >= s.total - 1) return 'bg-yellow-500';
    return 'bg-destructive';
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
    const result = buildChangePasswordSchema({ passwordPolicy: this.passwordPolicy }).safeParse({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    });
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
      this.fieldErrors = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      return;
    }
    this.fieldErrors = {};
    void this.authKit
      .changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword })
      .catch(() => {});
  }
}
