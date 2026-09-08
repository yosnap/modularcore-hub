import { describe, expect, it } from 'vitest';

import { resolveFieldConfig } from '../core/field-config.js';

describe('resolveFieldConfig', () => {
  it('disables every optional field by default', () => {
    const resolved = resolveFieldConfig();
    expect(resolved.firstName.enabled).toBe(false);
    expect(resolved.lastName.enabled).toBe(false);
    expect(resolved.phone.enabled).toBe(false);
    expect(resolved.legalConsent.enabled).toBe(false);
    expect(resolved.profileType.enabled).toBe(false);
    expect(resolved.turnstile.enabled).toBe(false);
  });

  it('defaults legalConsent.required to true once enabled', () => {
    const resolved = resolveFieldConfig({ legalConsent: { enabled: true, text: 'I accept the' } });
    expect(resolved.legalConsent.required).toBe(true);
  });

  it('derives profileType.defaultValue from the first option when unset', () => {
    const resolved = resolveFieldConfig({
      profileType: {
        enabled: true,
        options: [
          { value: 'user', label: 'User' },
          { value: 'collaborator', label: 'Collaborator' },
        ],
      },
    });
    expect(resolved.profileType.defaultValue).toBe('user');
  });

  it('keeps an explicit profileType.defaultValue', () => {
    const resolved = resolveFieldConfig({
      profileType: {
        enabled: true,
        defaultValue: 'collaborator',
        options: [
          { value: 'user', label: 'User' },
          { value: 'collaborator', label: 'Collaborator' },
        ],
      },
    });
    expect(resolved.profileType.defaultValue).toBe('collaborator');
  });
});
