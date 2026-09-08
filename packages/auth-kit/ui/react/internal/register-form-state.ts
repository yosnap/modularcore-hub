import { useMemo, useState } from 'react';

import { resolveFieldConfig } from '../../../core/field-config.js';
import { buildRegisterSchema, extractFieldError } from '../../../core/validation.js';

import type { FormEvent } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { AuthKitFieldConfig } from '../../../core/field-config.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface UseRegisterFormStateOptions {
  authKit: UseAuthKitResult;
  fieldConfig?: AuthKitFieldConfig;
  passwordPolicy?: PasswordPolicy;
}

/** Shared logic behind every RegisterForm presentation — only markup/classes differ between them. */
export function useRegisterFormState({
  authKit,
  fieldConfig,
  passwordPolicy,
}: UseRegisterFormStateOptions) {
  const fields = useMemo(() => resolveFieldConfig(fieldConfig), [fieldConfig]);

  const [email, setEmailRaw] = useState('');
  const [password, setPasswordRaw] = useState('');
  const [confirmPassword, setConfirmPasswordRaw] = useState('');
  const [firstName, setFirstNameRaw] = useState('');
  const [lastName, setLastNameRaw] = useState('');
  const [phone, setPhoneRaw] = useState('');
  const [profileType, setProfileType] = useState(fields.profileType.defaultValue);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  const clearError = (key: string): void => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setEmail = (value: string): void => {
    setEmailRaw(value);
    clearError('email');
  };
  const setPassword = (value: string): void => {
    setPasswordRaw(value);
    clearError('password');
  };
  const setConfirmPassword = (value: string): void => {
    setConfirmPasswordRaw(value);
    clearError('confirmPassword');
  };
  const setFirstName = (value: string): void => {
    setFirstNameRaw(value);
    clearError('firstName');
  };
  const setLastName = (value: string): void => {
    setLastNameRaw(value);
    clearError('lastName');
  };
  const setPhone = (value: string): void => {
    setPhoneRaw(value);
    clearError('phone');
  };

  const collectValues = (): Record<string, unknown> => {
    const values: Record<string, unknown> = { email, password, confirmPassword };
    if (fields.firstName.enabled) values.firstName = firstName;
    if (fields.lastName.enabled) values.lastName = lastName;
    if (fields.phone.enabled) values.phone = phone;
    if (fields.profileType.enabled) values.profileType = profileType;
    if (fields.legalConsent.enabled && fields.legalConsent.required)
      values.termsAccepted = termsAccepted;
    return values;
  };

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  const validateField = (key: string): void => {
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
    const message = extractFieldError(result, key);
    setFieldErrors((prev) => {
      if (!message) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: message };
    });
  };
  const onEmailBlur = (): void => validateField('email');
  const onPasswordBlur = (): void => validateField('password');
  const onConfirmPasswordBlur = (): void => validateField('confirmPassword');
  const onFirstNameBlur = (): void => validateField('firstName');
  const onLastNameBlur = (): void => validateField('lastName');
  const onPhoneBlur = (): void => validateField('phone');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = buildRegisterSchema(fields, { passwordPolicy }).safeParse(collectValues());
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    void authKit
      .register({
        email,
        password,
        firstName: fields.firstName.enabled ? firstName : undefined,
        lastName: fields.lastName.enabled ? lastName : undefined,
        phone: fields.phone.enabled ? phone : undefined,
        profileType: fields.profileType.enabled ? profileType : undefined,
        termsAccepted: fields.legalConsent.enabled ? termsAccepted : undefined,
        turnstileToken,
      })
      .catch(() => {});
  };

  return {
    fields,
    email,
    setEmail,
    onEmailBlur,
    password,
    setPassword,
    onPasswordBlur,
    confirmPassword,
    setConfirmPassword,
    onConfirmPasswordBlur,
    firstName,
    setFirstName,
    onFirstNameBlur,
    lastName,
    setLastName,
    onLastNameBlur,
    phone,
    setPhone,
    onPhoneBlur,
    profileType,
    setProfileType,
    termsAccepted,
    setTermsAccepted,
    turnstileToken,
    setTurnstileToken,
    fieldErrors,
    handleSubmit,
    flow: authKit.state.register,
  };
}
