import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import { SITE, BASE } from './src/site-config.mjs';
import versions from './versions.json' with { type: 'json' };

// Grupos de sidebar por versión archivada — generados desde versions.json, nunca a mano
// (red-team Finding 15: versions.json es la única fuente, evita estado duplicado).
const archivedSidebarGroups = versions.archived.map((slug) => ({
  label: `${slug} (archivada)`,
  collapsed: true,
  items: [{ autogenerate: { directory: slug } }],
}));

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    starlight({
      title: 'ModularCore Hub',
      defaultLocale: 'es',
      locales: {
        root: { label: 'Español', lang: 'es' },
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/yosnap/modularcore-hub' }],
      customCss: ['./src/styles/brand.css'],
      logo: {
        src: './public/logo.svg',
        replacesTitle: false,
      },
      favicon: '/favicon.ico',
      components: {
        SiteTitle: './src/components/VersionSelect.astro',
        Footer: './src/components/Footer.astro',
      },
      sidebar: [
        {
          label: 'Empezar',
          items: [
            { label: 'Introducción', slug: 'empezar/introduccion' },
            { label: 'Instalación', slug: 'empezar/instalacion' },
            { label: 'Inicio rápido', slug: 'empezar/inicio-rapido' },
          ],
        },
        {
          label: 'Conceptos',
          items: [
            { label: 'Arquitectura', slug: 'conceptos/arquitectura' },
            { label: 'Los 3 pilares', slug: 'conceptos/los-tres-pilares' },
            { label: 'Componentes headless', slug: 'conceptos/componentes-headless' },
            { label: 'Versionado de la doc', slug: 'conceptos/versionado' },
          ],
        },
        {
          label: 'Referencia',
          items: [
            {
              label: 'Herramientas',
              items: [
                { label: 'Visión general', slug: 'referencia/herramientas' },
                {
                  label: 'CLI',
                  items: [
                    { label: 'Visión general', slug: 'referencia/herramientas/cli' },
                    { label: 'init', slug: 'referencia/herramientas/cli/init' },
                    { label: 'add', slug: 'referencia/herramientas/cli/add' },
                    { label: 'list', slug: 'referencia/herramientas/cli/list' },
                    { label: 'search', slug: 'referencia/herramientas/cli/search' },
                    { label: 'diff', slug: 'referencia/herramientas/cli/diff' },
                    { label: 'update', slug: 'referencia/herramientas/cli/update' },
                  ],
                },
                {
                  label: 'MCP',
                  items: [
                    { label: 'Visión general (stdio)', slug: 'referencia/herramientas/mcp' },
                    { label: 'search_components', slug: 'referencia/herramientas/mcp/search-components' },
                    { label: 'get_component', slug: 'referencia/herramientas/mcp/get-component' },
                    { label: 'install_component', slug: 'referencia/herramientas/mcp/install-component' },
                    { label: 'check_updates', slug: 'referencia/herramientas/mcp/check-updates' },
                  ],
                },
                {
                  label: 'Web',
                  items: [
                    { label: 'Visión general', slug: 'referencia/herramientas/web' },
                    { label: 'Catálogo', slug: 'referencia/herramientas/web/catalogo' },
                    { label: 'Endpoints del registry', slug: 'referencia/herramientas/web/endpoints-registry' },
                  ],
                },
              ],
            },
            {
              label: 'Componentes',
              items: [
                { label: 'Visión general', slug: 'referencia/componentes' },
                { label: 'AI Chat', slug: 'referencia/componentes/ai-chat' },
                { label: 'Auto-SEO', slug: 'referencia/componentes/auto-seo' },
                { label: 'Media Picker', slug: 'referencia/componentes/media-picker' },
                { label: 'Modals', slug: 'referencia/componentes/modals' },
                { label: 'Hello Core', slug: 'referencia/componentes/hello-core' },
              ],
            },
            {
              label: 'Playground',
              items: [
                { label: 'Qué es y cómo funciona', slug: 'referencia/playground' },
                { label: 'AI Chat', slug: 'referencia/playground/ai-chat' },
                { label: 'Auto-SEO', slug: 'referencia/playground/auto-seo' },
                { label: 'Media Picker', slug: 'referencia/playground/media-picker' },
                { label: 'Modals', slug: 'referencia/playground/modals' },
              ],
            },
          ],
        },
        {
          label: 'Guías',
          items: [
            { label: 'Instalar un componente', slug: 'guias/instalar-un-componente' },
            { label: 'Actualizar componentes', slug: 'guias/actualizar-componentes' },
            { label: 'Migrar entre versiones', slug: 'guias/migrar-entre-versiones' },
            { label: 'Contribuir a la doc', slug: 'guias/contribuir' },
          ],
        },
        {
          label: 'Solución de problemas',
          items: [
            { label: 'Visión general', slug: 'solucion-de-problemas' },
            { label: 'Instalación', slug: 'solucion-de-problemas/instalacion' },
            { label: 'CLI', slug: 'solucion-de-problemas/cli' },
            { label: 'MCP', slug: 'solucion-de-problemas/mcp' },
            { label: 'Registry', slug: 'solucion-de-problemas/registry' },
          ],
        },
        ...archivedSidebarGroups,
      ],
    }),
  ],
});
