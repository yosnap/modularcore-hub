import { gunzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { buildTarball } from '../src/tarball.js';

describe('buildTarball', () => {
  it('produces a gzip-compressed buffer embedding the file content', async () => {
    const tarball = await buildTarball([
      {
        path: 'src/hello.ts',
        target: 'src/hello.ts',
        type: 'component',
        encoding: 'utf8',
        content: 'export const hi = 1;\n',
      },
    ]);

    expect(tarball[0]).toBe(0x1f);
    expect(tarball[1]).toBe(0x8b);

    const untarred = gunzipSync(tarball).toString('utf8');
    expect(untarred).toContain('src/hello.ts');
    expect(untarred).toContain('export const hi = 1;');
  });
});
