import { describe, expect, it } from 'vitest';

import { resolveFieldConfig } from '../core/field-config.js';
import { buildLoginSchema, buildPasswordSchema, buildRegisterSchema } from '../core/validation.js';

describe('buildPasswordSchema', () => {
  it('rejects a password missing a required class by default', () => {
    const schema = buildPasswordSchema();
    expect(schema.safeParse('alllowercase1').success).toBe(false); // no uppercase/special
    expect(schema.safeParse('Aa1!aaaa').success).toBe(true);
  });

  it('relaxes requirements per policy', () => {
    const schema = buildPasswordSchema({
      requireSpecial: false,
      requireUppercase: false,
      minLength: 6,
    });
    expect(schema.safeParse('abc123').success).toBe(true);
  });
});

describe('buildLoginSchema', () => {
  it('accepts a plain identifier + password', () => {
    expect(buildLoginSchema().safeParse({ identifier: 'a@b.com', password: 'x' }).success).toBe(
      true,
    );
  });
});

describe('buildRegisterSchema', () => {
  it('accepts email+password only when no optional field is enabled', () => {
    const schema = buildRegisterSchema(resolveFieldConfig());
    const result = schema.safeParse({
      email: 'a@b.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password/confirmPassword mismatch', () => {
    const schema = buildRegisterSchema(resolveFieldConfig());
    const result = schema.safeParse({
      email: 'a@b.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('requires termsAccepted=true when legalConsent is enabled and required', () => {
    const fields = resolveFieldConfig({ legalConsent: { enabled: true, text: 'I accept the' } });
    const schema = buildRegisterSchema(fields);
    const missing = schema.safeParse({
      email: 'a@b.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
    });
    expect(missing.success).toBe(false);

    const present = schema.safeParse({
      email: 'a@b.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
      termsAccepted: true,
    });
    expect(present.success).toBe(true);
  });

  it('restricts profileType to the configured option values', () => {
    const fields = resolveFieldConfig({
      profileType: {
        enabled: true,
        options: [
          { value: 'user', label: 'User' },
          { value: 'collaborator', label: 'Collaborator' },
        ],
      },
    });
    const schema = buildRegisterSchema(fields);
    const valid = schema.safeParse({
      email: 'a@b.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
      profileType: 'collaborator',
    });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({
      email: 'a@b.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
      profileType: 'not-an-option',
    });
    expect(invalid.success).toBe(false);
  });
});
