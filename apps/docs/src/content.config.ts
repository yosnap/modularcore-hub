import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Inyectado por Fase 5 (freeze-version.mjs) en páginas archivadas. La exclusión de
        // Pagefind usa el campo nativo `pagefind: false` de docsSchema (verificado en
        // starlight.astro.build/reference/frontmatter/) — no requiere extensión de esquema.
        archived: z.boolean().optional(),
      }),
    }),
  }),
};
