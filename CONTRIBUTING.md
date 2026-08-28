# Guía de Contribución — ModularCore Hub

¡Gracias por tu interés en contribuir! ModularCore Hub es un monorepo de componentes
headless multi-proveedor con distribución propia (Registry HTTP estático + CLI + Media
Picker + AI Chat + MCP server + Website). Esta guía describe el flujo de trabajo, las
convenciones y los requisitos de calidad para que tu contribución se integre sin fricción.

Antes de empezar, conviene leer el [`README.md`](./README.md) y, para el contrato completo
del producto, el PRD en [`modularcore-hub.md`](./modularcore-hub.md).

---

## Tabla de contenidos

- [Requisitos previos](#requisitos-previos)
- [Configuración del entorno](#configuración-del-entorno)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Flujo de trabajo Git](#flujo-de-trabajo-git)
- [Convenciones de commits](#convenciones-de-commits)
- [Estándares de código](#estándares-de-código)
- [Pruebas](#pruebas)
- [Changesets (versionado de paquetes)](#changesets-versionado-de-paquetes)
- [Checklist antes de abrir un Pull Request](#checklist-antes-de-abrir-un-pull-request)
- [Integración continua (CI)](#integración-continua-ci)
- [Reporte de bugs y solicitudes de features](#reporte-de-bugs-y-solicitudes-de-features)

---

## Requisitos previos

| Herramienta | Versión | Notas |
|-------------|---------|-------|
| **Node.js** | ≥ 22.13 | La versión fijada está en [`.nvmrc`](./.nvmrc) (`22`). |
| **pnpm** | 11.x | Se gestiona vía [corepack](https://nodejs.org/api/corepack.html); no lo instales globalmente a mano. |
| **Git** | reciente | — |

Habilita corepack una sola vez para obtener la versión de pnpm declarada en `packageManager`:

```bash
corepack enable
```

---

## Configuración del entorno

Este proyecto usa el flujo estándar de contribución vía **fork**.

1. Haz un fork de [`yosnap/modularcore-hub`](https://github.com/yosnap/modularcore-hub) en tu cuenta de GitHub.

2. Clona tu fork y añade el repositorio original como `upstream`:

   ```bash
   git clone https://github.com/<tu-usuario>/modularcore-hub.git
   cd modularcore-hub
   git remote add upstream https://github.com/yosnap/modularcore-hub.git
   ```

3. Instala dependencias (compila un binario nativo de `canvas`, puede tardar la primera vez):

   ```bash
   pnpm install
   ```

4. Verifica que todo pasa en limpio antes de tocar nada:

   ```bash
   pnpm build
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm test
   ```

### Variables de entorno

Copia [`.env.example`](./.env.example) a `.env` y complétalo **solo si** vas a trabajar con
adaptadores que requieren proveedores reales (Media Picker → S3/MinIO/Cloudinary, AI Chat →
OpenRouter). El desarrollo y las pruebas unitarias no necesitan credenciales: usan mocks.
**Nunca** commitees un `.env` real ni ninguna credencial.

---

## Estructura del monorepo

Espacios de trabajo definidos en [`pnpm-workspace.yaml`](./pnpm-workspace.yaml)
(`packages/*`, `apps/*`), orquestados con [Turborepo](https://turbo.build) ([`turbo.json`](./turbo.json)).

| Paquete | Scope | Publicable | Rol |
|---------|-------|:----------:|-----|
| `packages/registry` | `@modularcore/registry` | ✅ | Schema declarativo del registry + generación de datos HTTP estáticos. |
| `packages/registry-client` | `@modularcore/registry-client` | ✅ | Cliente para consumir el registry. |
| `packages/cli` | `@modularcore/cli` | ✅ | CLI thin-client: instala componentes por copy-code en el proyecto destino. |
| `packages/mcp-server` | `@modularcore/mcp-server` | ✅ | Servidor MCP para buscar e instalar componentes desde agentes IA. |
| `packages/media-picker` | `@modularcore/media-picker` | privado | Media Picker universal (adaptadores S3/Cloudinary, editor canvas). |
| `packages/ai-chat` | `@modularcore/ai-chat` | privado | Componente de AI Chat (OpenRouter, streaming). |
| `packages/modals` | `@modularcore/modals` | privado | Componente de modales con variantes y playground. |
| `packages/auto-seo` | `@modularcore/auto-seo` | privado | Generación de JSON-LD (SEO estructurado). |
| `packages/hello-core` | `@modularcore/hello-core` | privado | Paquete mínimo usado en el spike de inyección copy-code. |
| `apps/web` | `web` | privado | Website (SvelteKit): catálogo, docs y playgrounds. |

> Los directorios `fixtures/*` son objetivos de prueba de inyección (apps desechables) y **no**
> forman parte del workspace; se instalan aparte con `pnpm install --ignore-workspace`.

Cada paquete es autocontenido: `package.json` propio, `tsconfig.json`, `vitest.config.ts` y su
carpeta de pruebas. Ejemplo de estructura (Media Picker): `core/` (lógica isomórfica),
`adapters/` (proveedores), `ui/` (Svelte), `test/`, más `vitest.smoke.config.ts` para smokes.

---

## Flujo de trabajo Git

El proyecto sigue un modelo de tres niveles **feature → `develop` → `main`**
(detalle completo en [`docs/branching-release-strategy.md`](./docs/branching-release-strategy.md)):

| Rama | Rol |
|------|-----|
| `main` | Estado publicado / producción. Solo avanza vía release (`develop → main` + tag `vX.Y.Z`). Sin commits directos. |
| `develop` | Rama de integración por defecto. **Los Pull Requests apuntan aquí.** |
| `{tipo}/{slug}` | Tu rama de trabajo. Se ramifica de `develop`. |

### Pasos

1. Sincroniza tu `develop` con upstream:

   ```bash
   git fetch upstream
   git checkout develop
   git merge upstream/develop
   ```

2. Crea una rama descriptiva desde `develop`. Usa un prefijo de tipo coherente con
   Conventional Commits (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`…):

   ```bash
   git checkout -b feat/mi-mejora
   ```

3. Trabaja en commits atómicos (ver convenciones abajo).

4. Publica la rama en tu fork y abre el PR **contra `develop`** del repo original:

   ```bash
   git push -u origin feat/mi-mejora
   gh pr create --repo yosnap/modularcore-hub --base develop --head <tu-usuario>:feat/mi-mejora
   ```

**Enfoca cada PR en un solo tema.** Cambios sin relación (por ejemplo, documentación y un
rediseño de UI) deben ir en ramas y PRs separados: son más fáciles de revisar y aprobar.

---

## Convenciones de commits

Se usa [Conventional Commits](https://www.conventionalcommits.org/) con *scope* del paquete
afectado. Ejemplos tomados del historial real:

```
feat(registry): schema declarativo + validación zod
fix(deploy): copy brand assets into build stage
docs(brand): define neutral block borders
style(media-picker): format modern select controls
chore(release): version packages
```

Tipos habituales: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Reglas:

- **Sin secretos** en el diff ni en el mensaje (API keys, credenciales, `.env`).
- **Sin referencias a herramientas de IA** ni a asistentes en los mensajes de commit.
- Mantén el commit centrado en el cambio de código real.

---

## Estándares de código

- **TypeScript estricto.** La base compartida ([`tsconfig.base.json`](./tsconfig.base.json))
  activa `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`
  e `isolatedModules`. El código debe pasar `pnpm typecheck` sin errores.
- **ESLint** ([`eslint.config.js`](./eslint.config.js)): configuración flat con
  `@eslint/js` + `typescript-eslint` recomendados. Debe pasar `pnpm lint` sin errores.
- **Prettier** ([`.prettierrc`](./.prettierrc)): `singleQuote`, `semi`, `trailingComma: all`,
  `printWidth: 100`, `tabWidth: 2`. Formatea con `pnpm format` y verifica con `pnpm format:check`.
- **Nombres de archivo** en kebab-case y descriptivos.
- No introduzcas dependencias nuevas sin justificarlo en el PR.

---

## Pruebas

Se usa [Vitest](https://vitest.dev) en modo workspace ([`vitest.workspace.ts`](./vitest.workspace.ts),
`jsdom` para DOM/canvas). Hay dos niveles:

| Comando | Qué corre | Requiere credenciales |
|---------|-----------|:---------------------:|
| `pnpm test` | Pruebas unitarias / con mocks de todo el workspace. | No |
| `pnpm test:smoke` | Smokes contra proveedores reales (S3/MinIO, Cloudinary, OpenRouter). | Sí |

Para desarrollo de una contribución, **`pnpm test` debe pasar en verde**. Los smokes solo se
ejecutan en la CI al hacer push a ramas protegidas (ver abajo); no necesitas correrlos para un
PR desde un fork, pero sí acompañar tu cambio con pruebas unitarias cuando aplique.

Cada paquete guarda sus tests en su propia carpeta `test/` (o archivos `*.test.ts` junto al
código, como en `apps/web`). Añade pruebas para el comportamiento nuevo y para los casos límite.

---

## Changesets (versionado de paquetes)

Los paquetes publicables se versionan de forma independiente con
[Changesets](https://github.com/changesets/changesets). Si tu cambio **afecta el
comportamiento de algún paquete** en `packages/*`, añade un changeset:

```bash
pnpm changeset
```

Selecciona los paquetes afectados, el tipo de bump (`patch` / `minor` / `major`) y escribe un
resumen claro del cambio (será parte del changelog). Confírmalo junto a tu código.

No hace falta changeset para cambios que no tocan paquetes (por ejemplo, solo documentación
raíz o configuración de CI). `apps/web` y `@modularcore/hello-core` están excluidos del publish
([`.changeset/config.json`](./.changeset/config.json)).

---

## Checklist antes de abrir un Pull Request

Ejecuta la misma secuencia que valida la CI:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Además:

- [ ] La rama parte de `develop` y el PR apunta a `develop`.
- [ ] Commits en formato Conventional Commits, sin secretos ni referencias a IA.
- [ ] Se añadieron/actualizaron pruebas para el cambio.
- [ ] Se añadió un changeset si el cambio afecta a un paquete publicable.
- [ ] El PR trata un solo tema y su descripción explica el *qué* y el *porqué*.

---

## Integración continua (CI)

El workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) tiene dos jobs:

1. **`unit`** — Build · Typecheck · Lint · Format check · Test (unit/mock). Corre en **todos
   los Pull Requests, incluidos los de forks**. Es el que debe quedar verde en tu PR.
2. **`smokes`** — Pruebas contra proveedores reales. Solo corre en push a `develop`/`main`
   (nunca en PRs de fork, por seguridad: los secretos no se exponen a forks).

---

## Reporte de bugs y solicitudes de features

Abre un [issue](https://github.com/yosnap/modularcore-hub/issues) en el repositorio original.
Para bugs, incluye pasos de reproducción, comportamiento esperado vs. real, y versiones de
Node/pnpm/SO. Para features, describe el caso de uso y, si es posible, la propuesta de API.

---

¡Gracias por contribuir a ModularCore Hub! 🧩
