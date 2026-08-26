import { describe, expect, it } from 'vitest';

import { formatBytes } from '../core/format.js';

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats whole bytes with no decimal', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes with a decimal below 10', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('drops the decimal at/above 10 units', () => {
    expect(formatBytes(1024 * 12)).toBe('12 KB');
  });

  it('formats megabytes and gigabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
  });

  it('caps at the largest known unit instead of overflowing', () => {
    expect(formatBytes(1024 ** 5)).toBe('1024 TB');
  });

  it('returns an em dash for invalid input instead of throwing', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
