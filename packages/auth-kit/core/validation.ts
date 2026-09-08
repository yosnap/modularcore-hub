import { z } from 'zod';

import type { ResolvedFieldConfig } from './field-config.js';

/** Password policy knobs. All optional — pass an empty object to only require the minimum length. */
export interface PasswordPolicy {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
}

const DEFAULT_PASSWORD_POLICY: Required<PasswordPolicy> = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/** Permissive international phone format — digits, spaces, dashes, parens, an optional leading `+`. */
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

/** Builds a password `z.string()` schema from a policy — shared by register/reset/change-password schemas below. */
export function buildPasswordSchema(policy: PasswordPolicy = {}) {
  const p = { ...DEFAULT_PASSWORD_POLICY, ...policy };
  let schema = z.string().min(p.minLength, `Password must be at least ${p.minLength} characters`);
  if (p.requireUppercase) schema = schema.regex(/[A-Z]/, 'Password must contain an uppercase letter');
  if (p.requireLowercase) schema = schema.regex(/[a-z]/, 'Password must contain a lowercase letter');
  if (p.requireNumber) schema = schema.regex(/\d/, 'Password must contain a number');
  if (p.requireSpecial) schema = schema.regex(/[^A-Za-z0-9]/, 'Password must contain a special character');
  return schema;
}

export interface BuildSchemaOptions {
  passwordPolicy?: PasswordPolicy;
}

/** Plain email + password — the default when no optional field is enabled. */
export function buildLoginSchema() {
  return z.object({
    identifier: z.string().min(1, 'Required'),
    password: z.string().min(1, 'Required'),
  });
}

/**
 * Register schema shaped by `resolveFieldConfig()`'s output: an optional field only becomes
 * a required key in the schema when the consumer both enabled it AND marked it required.
 */
export function buildRegisterSchema(fields: ResolvedFieldConfig, options: BuildSchemaOptions = {}) {
  const shape: Record<string, z.ZodTypeAny> = {
    email: z.email('Invalid email'),
    password: buildPasswordSchema(options.passwordPolicy),
    confirmPassword: z.string().min(1, 'Required'),
  };

  if (fields.firstName.enabled) {
    shape.firstName = fields.firstName.required ? z.string().min(1, 'Required') : z.string().optional();
  }
  if (fields.lastName.enabled) {
    shape.lastName = fields.lastName.required ? z.string().min(1, 'Required') : z.string().optional();
  }
  if (fields.phone.enabled) {
    shape.phone = fields.phone.required
      ? z.string().min(1, 'Required').regex(PHONE_REGEX, 'Invalid phone number')
      : z.string().refine((value) => value === '' || PHONE_REGEX.test(value), 'Invalid phone number').optional();
  }
  if (fields.profileType.enabled) {
    const values = fields.profileType.options.map((option) => option.value) as [string, ...string[]];
    shape.profileType = values.length > 0 ? z.enum(values) : z.string();
  }
  if (fields.legalConsent.enabled && fields.legalConsent.required) {
    shape.termsAccepted = z.literal(true, { message: 'You must accept the terms' });
  }

  return z
    .object(shape)
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

export function buildChangePasswordSchema(options: BuildSchemaOptions = {}) {
  return z
    .object({
      currentPassword: z.string().min(1, 'Required'),
      newPassword: buildPasswordSchema(options.passwordPolicy),
      confirmPassword: z.string().min(1, 'Required'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

export function buildForgotPasswordSchema() {
  return z.object({ email: z.email('Invalid email') });
}

export function buildResetPasswordSchema(options: BuildSchemaOptions = {}) {
  return z
    .object({
      newPassword: buildPasswordSchema(options.passwordPolicy),
      confirmPassword: z.string().min(1, 'Required'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

export function buildResendVerificationSchema() {
  return z.object({ email: z.email('Invalid email') });
}

/**
 * Reads one field's error message out of a `safeParse` result — used for on-blur, single-field
 * validation (e.g. showing "Invalid email" as soon as the user leaves the email input) without
 * duplicating each schema's rules. `undefined` means that field currently has no issue, which
 * callers use to clear a previously-shown error for it.
 */
export function extractFieldError(result: z.ZodSafeParseResult<unknown>, field: string): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((issue) => String(issue.path[0]) === field)?.message;
}
