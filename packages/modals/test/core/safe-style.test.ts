import { describe, expect, it } from 'vitest';

import { safeColor } from '../../ui/safe/style.js';

describe('safeColor', () => {
  it('accepts hex (3/6/8 digit) and rgb()/rgba()', () => {
    expect(safeColor('#fff')).toBe('#fff');
    expect(safeColor('#ffffff')).toBe('#ffffff');
    expect(safeColor('#ffffffff')).toBe('#ffffffff');
    expect(safeColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
    expect(safeColor('rgba(0, 0, 0, 0.5)')).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('rejects anything else, including CSS-injection payloads', () => {
    expect(safeColor('red; background: url(javascript:alert(1))')).toBeUndefined();
    expect(safeColor('expression(alert(1))')).toBeUndefined();
    expect(safeColor(undefined)).toBeUndefined();
  });
});
