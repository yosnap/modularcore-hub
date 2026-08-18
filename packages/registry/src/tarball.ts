import { gzipSync } from 'node:zlib';

import { pack } from 'tar-stream';

import type { RegistryFileWithContent } from './schema.js';

/**
 * `tar-stream` builds the tar entries in memory (no filesystem round-trip), and
 * `zlib.gzipSync` (Node builtin) compresses the resulting buffer — avoids depending on a
 * full `tar` CLI wrapper package just to produce a `.tar.gz` from in-memory content.
 */
export async function buildTarball(files: RegistryFileWithContent[]): Promise<Buffer> {
  const tarPack = pack();
  const chunks: Buffer[] = [];
  tarPack.on('data', (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolvePromise, rejectPromise) => {
    tarPack.on('end', () => resolvePromise(Buffer.concat(chunks)));
    tarPack.on('error', rejectPromise);
  });

  for (const file of files) {
    const content =
      file.encoding === 'base64'
        ? Buffer.from(file.content, 'base64')
        : Buffer.from(file.content, 'utf8');
    await new Promise<void>((resolveEntry, rejectEntry) => {
      tarPack.entry({ name: file.target }, content, (error) =>
        error ? rejectEntry(error) : resolveEntry(),
      );
    });
  }
  tarPack.finalize();

  const tarBuffer = await done;
  return gzipSync(tarBuffer);
}
