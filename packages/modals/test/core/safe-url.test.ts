import { describe, expect, it } from 'vitest';

import { safeHref, safeImageSrc } from '../../ui/safe/url.js';

describe('safeHref', () => {
  it('allows https/http/mailto/tel', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com/');
    expect(safeHref('http://example.com')).toBe('http://example.com/');
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(safeHref('tel:+123456')).toBe('tel:+123456');
  });

  it('rejects javascript:, data:, and malformed URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html,<script>')).toBeUndefined();
    expect(safeHref('not a url')).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });

  it('allows a root-relative in-app path and keeps it relative', () => {
    expect(safeHref('/pricing')).toBe('/pricing');
  });

  it('rejects a protocol-relative URL (resolves to an arbitrary host)', () => {
    expect(safeHref('//evil.com')).toBeUndefined();
  });

  it('rejects a backslash-disguised protocol-relative URL (WHATWG normalizes \\ to / for http(s))', () => {
    expect(safeHref('/\\evil.com')).toBeUndefined();
    expect(safeHref('/\\\\evil.com')).toBeUndefined();
  });
});

describe('safeImageSrc', () => {
  it('allows https, rejects http/javascript:', () => {
    expect(safeImageSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(safeImageSrc('http://example.com/a.png')).toBeUndefined();
    expect(safeImageSrc('javascript:alert(1)')).toBeUndefined();
  });

  it('rejects data: by default, allows it opt-in under the size cap', () => {
    const small = 'data:image/png;base64,AAAA';
    expect(safeImageSrc(small)).toBeUndefined();
    expect(safeImageSrc(small, { allowData: true })).toBe(small);

    const huge = `data:image/png;base64,${'A'.repeat(200_001)}`;
    expect(safeImageSrc(huge, { allowData: true })).toBeUndefined();
  });
});
