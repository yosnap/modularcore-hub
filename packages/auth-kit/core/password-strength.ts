import type { PasswordPolicy } from './validation.js';

export interface PasswordRequirement {
  key: 'minLength' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  /** How many of the *active* requirements (per policy) the password currently meets. */
  score: number;
  /** Total number of active requirements — `score === total` means the password is fully valid. */
  total: number;
  requirements: PasswordRequirement[];
}

const DEFAULT_POLICY: Required<PasswordPolicy> = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Pure function shared by every framework's shadcn presentation to render a strength bar +
 * requirement checklist next to a password field — kept in core so the five UI layers never
 * duplicate (or silently diverge on) what counts as "strong enough".
 */
export function evaluatePasswordStrength(password: string, policy: PasswordPolicy = {}): PasswordStrength {
  const p = { ...DEFAULT_POLICY, ...policy };
  const requirements: PasswordRequirement[] = [
    { key: 'minLength', label: `At least ${p.minLength} characters`, met: password.length >= p.minLength },
  ];
  if (p.requireUppercase) requirements.push({ key: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(password) });
  if (p.requireLowercase) requirements.push({ key: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(password) });
  if (p.requireNumber) requirements.push({ key: 'number', label: 'One number', met: /\d/.test(password) });
  if (p.requireSpecial) requirements.push({ key: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) });

  const score = requirements.filter((r) => r.met).length;
  return { score, total: requirements.length, requirements };
}
