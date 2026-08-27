import { describe, expect, it } from 'vitest';
import { createSchema } from '../core/create-schema.js';
import { validate } from '../core/validate.js';

describe('createSchema + validate — Article', () => {
  it('builds a valid Article JSON-LD object', () => {
    const schema = createSchema('Article', {
      headline: 'Modular components for the modern web',
      datePublished: '2026-08-25',
      author: { '@type': 'Person', name: 'Jane Doe' },
    });

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Article');
    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when datePublished is missing', () => {
    const schema = createSchema('Article', {
      headline: 'Missing date',
    } as never);

    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('datePublished'))).toBe(true);
  });
});

describe('createSchema + validate — Product', () => {
  it('builds a valid Product JSON-LD object', () => {
    const schema = createSchema('Product', {
      name: 'Wireless Headphones',
      offers: { '@type': 'Offer', price: '99.99', priceCurrency: 'USD' },
    });

    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when offers is missing', () => {
    const schema = createSchema('Product', { name: 'No offers' } as never);
    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('offers'))).toBe(true);
  });
});

describe('createSchema + validate — Organization', () => {
  it('builds a valid Organization JSON-LD object', () => {
    const schema = createSchema('Organization', {
      name: 'ModularCore',
      logo: 'https://modularcore.dev/logo.png',
    });

    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when logo is missing', () => {
    const schema = createSchema('Organization', { name: 'No logo' } as never);
    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('logo'))).toBe(true);
  });
});

describe('createSchema + validate — BreadcrumbList', () => {
  it('builds a valid BreadcrumbList JSON-LD object', () => {
    const schema = createSchema('BreadcrumbList', {
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://modularcore.dev' },
        { '@type': 'ListItem', position: 2, name: 'Docs', item: 'https://modularcore.dev/docs' },
      ],
    });

    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when itemListElement is missing', () => {
    const schema = createSchema('BreadcrumbList', {} as never);
    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('itemListElement'))).toBe(true);
  });
});

describe('createSchema + validate — WebSite', () => {
  it('builds a valid WebSite JSON-LD object', () => {
    const schema = createSchema('WebSite', {
      name: 'ModularCore Hub',
      url: 'https://modularcore.dev',
    });

    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when url is missing', () => {
    const schema = createSchema('WebSite', { name: 'No url' } as never);
    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('url'))).toBe(true);
  });
});

describe('createSchema + validate — LocalBusiness', () => {
  it('builds a valid LocalBusiness JSON-LD object', () => {
    const schema = createSchema('LocalBusiness', {
      name: 'Corner Bakery',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
        addressLocality: 'Springfield',
      },
    });

    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when address is missing', () => {
    const schema = createSchema('LocalBusiness', { name: 'No address' } as never);
    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('address'))).toBe(true);
  });
});

describe('createSchema + validate — FAQPage', () => {
  it('builds a valid FAQPage JSON-LD object', () => {
    const schema = createSchema('FAQPage', {
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is ModularCore?',
          acceptedAnswer: { '@type': 'Answer', text: 'A copy-code component registry.' },
        },
      ],
    });

    expect(validate(schema).valid).toBe(true);
  });

  it('fails validation when mainEntity is missing', () => {
    const schema = createSchema('FAQPage', {} as never);
    const result = validate(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('mainEntity'))).toBe(true);
  });
});

describe('validate — unsupported input', () => {
  it('fails when "@type" is missing entirely', () => {
    const result = validate({ '@context': 'https://schema.org' } as never);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('@type');
  });
});
