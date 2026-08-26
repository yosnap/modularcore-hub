import { describe, expect, it } from 'vitest';
import { createSchema } from '../core/create-schema.js';
import { stringify } from '../core/stringify.js';

describe('stringify — hard security gate (script-tag injection)', () => {
  it('never outputs an unescaped "<" when a field contains a </script> payload', () => {
    const malicious = '</script><script>alert(1)</script>';
    const schema = createSchema('Article', {
      headline: malicious,
      datePublished: '2026-08-25',
    });

    const output = stringify(schema);

    // The exact hard-gate assertion: no raw "<" survives in the output,
    // no matter what the field value contains. Checking JSON.parse() alone
    // is NOT sufficient — a parseable string can still contain a raw "<".
    expect(output.includes('<')).toBe(false);
    expect(output).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>');
    expect(output).not.toContain('</script>');

    // The escaped output must still round-trip back to the original value
    // once unescaped by the browser's JSON parser.
    const unescaped = output.replace(/\\u003c/g, '<');
    expect(JSON.parse(unescaped).headline).toBe(malicious);
  });

  it('escapes every "<" occurrence, not just the first one', () => {
    const schema = createSchema('Article', {
      headline: '<a><b><c>',
      datePublished: '2026-08-25',
    });

    const output = stringify(schema);
    expect(output.includes('<')).toBe(false);
    expect((output.match(/\\u003c/g) ?? []).length).toBe(3);
  });
});

describe('stringify — general serialization', () => {
  it('produces valid JSON that JSON.parse() can consume', () => {
    const schema = createSchema('WebSite', { name: 'Site', url: 'https://example.com' });
    const output = stringify(schema);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('correctly serializes slashes, quotes and unicode characters', () => {
    const schema = createSchema('Organization', {
      name: 'Café "Modular" / Núñez & Co.',
      logo: 'https://example.com/logo.png',
    });

    const output = stringify(schema);
    const parsed = JSON.parse(output) as { name: string };
    expect(parsed.name).toBe('Café "Modular" / Núñez & Co.');
  });

  it('resolves root-relative URLs to absolute when { absolute } is set', () => {
    const schema = createSchema('Organization', {
      name: 'ModularCore',
      logo: '/logo.png',
    });

    const output = stringify(schema, { absolute: 'https://modularcore.dev' });
    const parsed = JSON.parse(output) as { logo: string };
    expect(parsed.logo).toBe('https://modularcore.dev/logo.png');
  });

  it('leaves already-absolute URLs untouched when { absolute } is set', () => {
    const schema = createSchema('Organization', {
      name: 'ModularCore',
      logo: 'https://cdn.example.com/logo.png',
    });

    const output = stringify(schema, { absolute: 'https://modularcore.dev' });
    const parsed = JSON.parse(output) as { logo: string };
    expect(parsed.logo).toBe('https://cdn.example.com/logo.png');
  });

  it('regression: does not corrupt a plain text field that happens to start with "/"', () => {
    const schema = createSchema('Article', {
      headline: '/2026 fue un gran año para componentes modulares',
      datePublished: '2026-08-25',
    });

    const output = stringify(schema, { absolute: 'https://modularcore.dev' });
    const parsed = JSON.parse(output) as { headline: string };
    expect(parsed.headline).toBe('/2026 fue un gran año para componentes modulares');
  });
});
