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
  let schema = z.string().min(p.minLength, `La contraseña debe tener al menos ${p.minLength} caracteres`);
  if (p.requireUppercase) schema = schema.regex(/[A-Z]/, 'La contraseña debe contener una letra mayúscula');
  if (p.requireLowercase) schema = schema.regex(/[a-z]/, 'La contraseña debe contener una letra minúscula');
  if (p.requireNumber) schema = schema.regex(/\d/, 'La contraseña debe contener un número');
  if (p.requireSpecial) schema = schema.regex(/[^A-Za-z0-9]/, 'La contraseña debe contener un carácter especial');
  return schema;
}

export interface BuildSchemaOptions {
  passwordPolicy?: PasswordPolicy;
}

/** Plain email + password — the default when no optional field is enabled. */
export function buildLoginSchema() {
  return z.object({
    identifier: z.string().min(1, 'Obligatorio'),
    password: z.string().min(1, 'Obligatorio'),
  });
}

/**
 * Register schema shaped by `resolveFieldConfig()`'s output: an optional field only becomes
 * a required key in the schema when the consumer both enabled it AND marked it required.
 */
export function buildRegisterSchema(fields: ResolvedFieldConfig, options: BuildSchemaOptions = {}) {
  const shape: Record<string, z.ZodTypeAny> = {
    email: z.email('Email no válido'),
    password: buildPasswordSchema(options.passwordPolicy),
    confirmPassword: z.string().min(1, 'Obligatorio'),
  };

  if (fields.firstName.enabled) {
    shape.firstName = fields.firstName.required ? z.string().min(1, 'Obligatorio') : z.string().optional();
  }
  if (fields.lastName.enabled) {
    shape.lastName = fields.lastName.required ? z.string().min(1, 'Obligatorio') : z.string().optional();
  }
  if (fields.phone.enabled) {
    shape.phone = fields.phone.required
      ? z.string().min(1, 'Obligatorio').regex(PHONE_REGEX, 'Número de teléfono no válido')
      : z.string().refine((value) => value === '' || PHONE_REGEX.test(value), 'Número de teléfono no válido').optional();
  }
  if (fields.profileType.enabled) {
    const values = fields.profileType.options.map((option) => option.value) as [string, ...string[]];
    shape.profileType = values.length > 0 ? z.enum(values) : z.string();
  }
  if (fields.legalConsent.enabled && fields.legalConsent.required) {
    shape.termsAccepted = z.literal(true, { message: 'Debes aceptar los términos' });
  }

  return z
    .object(shape)
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    });
}

export function buildChangePasswordSchema(options: BuildSchemaOptions = {}) {
  return z
    .object({
      currentPassword: z.string().min(1, 'Obligatorio'),
      newPassword: buildPasswordSchema(options.passwordPolicy),
      confirmPassword: z.string().min(1, 'Obligatorio'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    });
}

export function buildForgotPasswordSchema() {
  return z.object({ email: z.email('Email no válido') });
}

export function buildResetPasswordSchema(options: BuildSchemaOptions = {}) {
  return z
    .object({
      newPassword: buildPasswordSchema(options.passwordPolicy),
      confirmPassword: z.string().min(1, 'Obligatorio'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    });
}

export function buildResendVerificationSchema() {
  return z.object({ email: z.email('Email no válido') });
}

/**
 * Reads one field's error message out of a `safeParse` result — used for on-blur, single-field
 * validation (e.g. showing "Email no válido" as soon as the user leaves the email input) without
 * duplicating each schema's rules. `undefined` means that field currently has no issue, which
 * callers use to clear a previously-shown error for it.
 */
export function extractFieldError(result: z.ZodSafeParseResult<unknown>, field: string): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((issue) => String(issue.path[0]) === field)?.message;
}
