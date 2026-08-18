import { describe, expect, it } from 'vitest';

import { registryDescriptorSchema } from '../src/schema.zod.js';

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const clone = { ...obj };
  delete (clone as Partial<T>)[key];
  return clone;
}

function validDescriptor() {
  return {
    name: 'sample',
    version: '1.0.0',
    title: 'Sample',
    type: 'frontend-component',
    category: 'ui',
    frameworks: ['react'],
    visibility: 'public',
    peerDependencies: { react: '>=18' },
    dependencies: [],
    registryDependencies: [],
    envVariables: [{ key: 'API_KEY', description: 'API key', required: true }],
    files: [{ path: 'src/sample.tsx', target: 'src/modularcore/sample.tsx', type: 'component', encoding: 'utf8' }],
  };
}

describe('registryDescriptorSchema', () => {
  it('accepts a valid descriptor and defaults visibility to public', () => {
    const withoutVisibility = omit(validDescriptor(), 'visibility');
    const result = registryDescriptorSchema.safeParse(withoutVisibility);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe('public');
    }
  });

  it('rejects a descriptor missing required fields', () => {
    const invalid = omit(validDescriptor(), 'title');
    const result = registryDescriptorSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects a descriptor with an empty files array', () => {
    const descriptor = { ...validDescriptor(), files: [] };
    const result = registryDescriptorSchema.safeParse(descriptor);
    expect(result.success).toBe(false);
  });

  it.each([
    ['../../.env', 'parent traversal'],
    ['nested/../../escape.ts', 'nested traversal'],
    ['/etc/passwd', 'absolute unix path'],
    ['C:\\secrets.txt', 'absolute windows path'],
  ])('rejects file path traversal: %s (%s)', (path) => {
    const descriptor = {
      ...validDescriptor(),
      files: [{ path, target: 'src/out.ts', type: 'component', encoding: 'utf8' }],
    };
    const result = registryDescriptorSchema.safeParse(descriptor);
    expect(result.success).toBe(false);
  });

  it('rejects target path traversal', () => {
    const descriptor = {
      ...validDescriptor(),
      files: [{ path: 'src/sample.tsx', target: '../../outside.tsx', type: 'component', encoding: 'utf8' }],
    };
    const result = registryDescriptorSchema.safeParse(descriptor);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid encoding value', () => {
    const descriptor = {
      ...validDescriptor(),
      files: [{ path: 'src/sample.tsx', target: 'src/out.tsx', type: 'component', encoding: 'latin1' }],
    };
    const result = registryDescriptorSchema.safeParse(descriptor);
    expect(result.success).toBe(false);
  });

  it('rejects a non-kebab-case name', () => {
    const descriptor = { ...validDescriptor(), name: 'Sample_Component' };
    const result = registryDescriptorSchema.safeParse(descriptor);
    expect(result.success).toBe(false);
  });
});
