import { describe, expect, it } from 'vitest';
import { createGraph } from '../core/create-graph.js';
import { createSchema } from '../core/create-schema.js';
import { validate } from '../core/validate.js';

describe('createGraph', () => {
  it('combines 2+ schemas into a single @graph with a shared @context', () => {
    const product1 = createSchema('Product', {
      name: 'Wireless Headphones',
      offers: { '@type': 'Offer', price: '99.99', priceCurrency: 'USD' },
    });
    const product2 = createSchema('Product', {
      name: 'USB-C Charger',
      offers: { '@type': 'Offer', price: '19.99', priceCurrency: 'USD' },
    });
    const org = createSchema('Organization', {
      name: 'ModularCore',
      logo: 'https://modularcore.dev/logo.png',
    });

    const graph = createGraph(product1, product2, org);

    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toHaveLength(3);
    expect(graph['@graph'].every((item) => !('@context' in item))).toBe(true);
    expect(graph['@graph'][0]?.['@type']).toBe('Product');
    expect(graph['@graph'][2]?.['@type']).toBe('Organization');
  });

  it('validates every item inside the graph independently', () => {
    const valid = createSchema('WebSite', { name: 'Site', url: 'https://example.com' });
    const invalid = createSchema('Article', { headline: 'Missing date' } as never);

    const graph = createGraph(valid, invalid);
    const result = validate(graph);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('datePublished'))).toBe(true);
  });

  it('throws when called with zero schemas', () => {
    expect(() => createGraph()).toThrow();
  });
});
