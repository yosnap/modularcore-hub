import { describe, expect, it } from 'vitest';

import { evaluatePasswordStrength } from '../core/password-strength.js';

describe('evaluatePasswordStrength', () => {
  it('reports 0/5 for an empty password with the default policy', () => {
    const result = evaluatePasswordStrength('');
    expect(result).toEqual({ score: 0, total: 5, requirements: expect.any(Array) });
    expect(result.requirements.every((r) => !r.met)).toBe(true);
  });

  it('reports 5/5 for a password satisfying every default requirement', () => {
    const result = evaluatePasswordStrength('Aa1!aaaa');
    expect(result.score).toBe(5);
    expect(result.total).toBe(5);
  });

  it('shrinks total when the policy disables a requirement', () => {
    const result = evaluatePasswordStrength('abc123', {
      requireUppercase: false,
      requireSpecial: false,
      minLength: 6,
    });
    expect(result.total).toBe(3);
    expect(result.score).toBe(3);
  });
});
