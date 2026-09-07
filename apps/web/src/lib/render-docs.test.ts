import { describe, expect, it } from 'vitest';

import { renderDocsMarkdown } from './render-docs';

describe('renderDocsMarkdown', () => {
  it('convierte los títulos, que antes salían con las almohadillas en crudo', () => {
    const html = renderDocsMarkdown('# Título\n\n## Sección\n');

    expect(html).toContain('<h1>Título</h1>');
    expect(html).toContain('<h2>Sección</h2>');
    expect(html).not.toContain('#');
  });

  it('convierte las listas, que antes salían con los guiones', () => {
    const html = renderDocsMarkdown('- uno\n- dos\n');

    expect(html).toContain('<ul><li>uno</li><li>dos</li></ul>');
  });

  it('junta en un párrafo las líneas que el fichero parte por ancho', () => {
    const html = renderDocsMarkdown('Una frase larga\nque sigue en la línea siguiente.\n');

    expect(html).toBe('<p>Una frase larga que sigue en la línea siguiente.</p>');
  });

  it('mantiene el bloque de código tal cual, sin tocar su contenido', () => {
    const html = renderDocsMarkdown('```ts\nconst a = 1 < 2;\n```\n');

    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('const a = 1 &lt; 2;');
  });

  it('no interpreta el marcado que haya dentro de un bloque de código', () => {
    const html = renderDocsMarkdown('```\n# esto no es un título\n- ni una lista\n```\n');

    expect(html).not.toContain('<h1>');
    expect(html).not.toContain('<li>');
  });

  it('escapa el HTML del documento: la documentación puede venir de fuera', () => {
    const html = renderDocsMarkdown('Un <script>alert(1)</script> suelto\n');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('descarta un href que no sea http(s) ni un ancla, y deja el texto', () => {
    const html = renderDocsMarkdown('[pincha aquí](javascript:alert(1))\n');

    expect(html).not.toContain('javascript:');
    expect(html).toContain('pincha aquí');
  });

  it('deja el texto de un enlace a un fichero del repo, que desde la web no lleva a ningún sitio', () => {
    const html = renderDocsMarkdown('Ver [core/provider.ts](./core/provider.ts)\n');

    expect(html).not.toContain('<a');
    expect(html).toContain('core/provider.ts');
  });

  it('conserva un enlace externo', () => {
    const html = renderDocsMarkdown('[la web](https://modularcorehub.com)\n');

    expect(html).toContain('href="https://modularcorehub.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('quita el frontmatter de las referencias de apps/docs', () => {
    const html = renderDocsMarkdown('---\ntitle: "Media Picker"\n---\n\n# Media Picker\n');

    expect(html).not.toContain('title:');
    expect(html).toContain('<h1>Media Picker</h1>');
  });

  it('resalta el código y la negrita dentro de un párrafo', () => {
    const html = renderDocsMarkdown('El **núcleo** vive en `core/media-picker.ts`.\n');

    expect(html).toContain('<strong>núcleo</strong>');
    expect(html).toContain('<code>core/media-picker.ts</code>');
  });
});
