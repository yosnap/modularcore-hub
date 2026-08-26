# v1.1 Fase 2 Planificado: Scope Congelado a Auto-SEO + MCP Server; Red-Team Reveló Trampa en Arquitectura de Error

**Fecha**: 2026-08-25 19:48
**Severidad**: Medium (plan validado, 2 Critical hallazgos encontrados y corregidos, pero MCP SDK version assumption casi nos torpedea)
**Componente**: ModularCore Hub v1.1 Fase 2 planning (Auto-SEO/JSON-LD + MCP server)
**Estado**: Completado y validado; plan en `plans/260825-1931-modularcore-hub-v11-auto-seo-y-mcp-server/`; listo para `/ak:cook`

## Qué Pasó

MVP Fase 1 (v0.8.2) está en producción. Usuario decidió scopear v1.1 a **solo 2 de 6 items originales**: Auto-SEO JSON-LD (headless, sin adapters) + MCP server propio (@modelcontextprotocol/sdk, stdio). Seguimos workflow completo:

1. **Scope challenge documentado** (HOLD ya decidido con usuario antes de sesión)
2. **Research paralelo**: 2 agentes researcher simultáneamente
   - Auto-SEO: schema-dts + zod + JSON-LD generación headless
   - MCP: @modelcontextprotocol/sdk stdio elicitation + 4 tools base
   - 1 scout de repo conventions (package.json, modularcore.json shape, registry-client.ts patterns, turbo.json, changesets)
3. **Plan escrito**: `ak plan create` → 4 fases en `plans/260825-1931-modularcore-hub-v11-auto-seo-y-mcp-server/`
   - Fase 1: Registry Client Compartido (extraer registry-client.ts + helpers de CLI a @modularcore/registry-client)
   - Fase 2: Auto-SEO JSON-LD Core
   - Fase 3: MCP Server
   - Fase 4: Registry Descriptors, Docs & Release
4. **Red-team adversarial**: 3 revisores hostiles (Security Adversary, Failure Mode Analyst, Assumption Destroyer) → 20 hallazgos brutos, deduplicados a 10 únicos
5. **Validate**: 3 preguntas clave para desambiguar (MCP website catalog, frameworks field, schema-dts scope)
6. **Resultado**: plan validado con `ak plan validate` (formato OK)

## La Verdad Brutal

**Casi nos metemos en dos agujeros negros técnicos que podrían haber explosionado en Fase 3.**

Red-team halló **2 Critical** que hablaban de errores de suposición profundos en el plan, no just implementación:

1. **RegistryClientError instanceof handler rompe en CLI** (hallazgo: Security Adversary + Failure Mode Analyst convergen). Cuando migramos registry-client.ts de CLI a paquete nuevo, la clase RegistryClientError vive en nuevo paquete. El catch en `packages/cli/src/index.ts:121` hace `instanceof CliError` → RegistryClientError nunca coincide porque extiende Error en CLI-scope original, no en el CLI actual. **El error es silencioso**: CLI captura el error pero no lo serializa correctamente, usuario ve stack trace sin contexto. Solución aplicada: RegistryClientError extiende Error directamente en el nuevo paquete; CLI actualiza su catch para `instanceof RegistryClientError || instanceof CliError`.

2. **@modelcontextprotocol/sdk está en v1.30.0, no existe v2** (hallazgo: Assumption Destroyer). Plan afirmaba erróneamente "última versión: v2". Verificamos con `npm view @modelcontextprotocol/sdk versions` → realidad es 1.30.0. Impacto: si implementamos sobre suposición de v2 API, todo el Fase 3 se rompe. Solución: corrección global en plan + se añadió **step 0 obligatorio en Fase 3** (spike de elicitation API) antes de implementar las 4 tools, con validación contra API real.

Otros 8 High aceptados (puertas giratoria en Node module resolution, cambios en turbo.json cache, descriptor shape collision si otro paquete ya usa "frameworks", conflicto de exports en package.json).

## Detalles Técnicos

**RegistryClientError instanceof trap**:
```
// ANTES (rompe):
// registry-client.ts en nuevo paquete
export class RegistryClientError extends Error { ... }

// packages/cli/src/index.ts
} catch (e) {
  if (e instanceof CliError) { /* manejo */ }
  // RegistryClientError cae a generic error handling sin logging
}

// DESPUÉS (funciona):
// packages/registry-client/src/index.ts
export class RegistryClientError extends Error { ... }

// packages/cli/src/index.ts
import { RegistryClientError } from '@modularcore/registry-client';
} catch (e) {
  if (e instanceof CliError || e instanceof RegistryClientError) { /* manejo */ }
}
```

**@modelcontextprotocol/sdk version reality**:
```bash
npm view @modelcontextprotocol/sdk versions
# [ '0.0.1', '1.0.0', ..., '1.30.0' ]
# NO v2 exists
```

Plan corregido + Fase 3 spike definida:
```
Fase 3 Step 0 (BLOQUEANTE):
  - npm install @modelcontextprotocol/sdk@latest
  - verificar elicitation API en @modelcontextprotocol/sdk/docs/main.d.ts
  - confirmar 4 tools shape vs plan assumptions
  - GO/NO-GO antes de implementación
```

## Qué Intentamos

1. **Red-team adversarial**: 3 revisores escribieron contra el plan (no contra código). Simularon escenarios: migración de error handling, versioning surprises, descriptor collisions.
2. **Grep validation**: confirmamos que registry-client.ts está en `packages/cli/src/registry-client.ts` (source real encontrado).
3. **npm audit**: `npm view @modelcontextprotocol/sdk` para verificar versioning real.
4. **Validate loop**: 3 preguntas estructura desambigación (MCP website listing, frameworks field enum, schema-dts devDependency).

## Análisis de Causa Raíz

**RegistryClientError trap**: el plan asumió que migrar una clase de un paquete a otro es "cambio transparente". No lo es. Error handling en Node.js usa `instanceof` por identidad de clase, no por nombre. Si CLI originalmente capturaba `CliError` (local al CLI), y ahora importa `RegistryClientError` (desde otro paquete), la cadena de herencia se rompe porque **cada módulo tiene su propio scope de clases**. Lección: error handling en monorepos requiere **explicit instanceof checks en todos los sitios de catch**, no asunción de transpiling automático.

**@modelcontextprotocol/sdk version**: el plan fue escrito sin verificar npm registry. Asunción de "v2" vino de: "SDK moderno probablemente tiene v2 por ahora (2026)". Realidad: project va lento, última release es 1.30.0. Impacto: si programábamos contra API v2, fallaba. Lección: **verificar semver REAL antes de architecture planning**, no confiar en tendencias o suposiciones de evolución.

## Lecciones Aprendidas

1. **instanceof en monorepos es una bomba de tiempo**: error handling que funciona en un paquete aislado falla cuando migramos clases entre paquetes. Solución: audit TODOS los catch blocks que usan `instanceof` antes de mover clases. Documentar la cadena de herencia explícitamente en el tipo exportado.

2. **Verificar semver ANTES de planificar**: `npm view <package> versions` debe ser parte de la checklist de research, no de spiking. Nos salvó el red-team; sin ellos, Fase 3 fallaba en primer commit.

3. **Spike obligatorio para SDKs externos**: cuando la arquitectura depende de una API externa que podría cambiar (elicitation en @modelcontextprotocol/sdk), el plan DEBE incluir un step 0 de spike, no asumir API. Esto es especialmente crítico en MCP donde la comunidad está en flux.

4. **Red-team adversarial escala mejor que predict**: 3 revisores hostiles encontraron 2 Critical que habrían torpedoeado Fase 3. Predict (iteración colaborativa) habría sido más lento. Para planes que migran arquitectura + introducen deps nuevas, red-team es obligatorio.

5. **Descriptor shape debe ser único en el monorepo**: si otro paquete usa "frameworks" field en su JSON, colisión silenciosa. Solución: namespacear en modularcore.json (ej: "auto-seo.frameworks"). No hicimos esto en el plan; lo añadimos como High tech debt (resolver en Fase 4).

## Siguientes Pasos

1. **Fase 1 (Registry Client)**: extraer registry-client.ts + resolveTargetPath + writeFilesTracked de CLI a @modularcore/registry-client. Incluir el fix de instanceof en CLI catch.
2. **Fase 3 Step 0 (MCP Spike)**: verificar @modelcontextprotocol/sdk elicitation API real antes de implementar tools. Documentar API encontrada en spike-report.md.
3. **Descriptor namespace**: resolver collision de "frameworks" field (namespacear a modularcore.json.auto-seo.frameworks o similar). Tech debt para Fase 4.
4. **Error handling audit**: revisar TODOS los `instanceof` en CLI, Registry Client, y MCP Server package una vez implementados. Documentar cadena de herencia esperada.
5. **CI/test validation**: antes de merge Fase 1→Fase 2, confirmar que error handling sigue funcionando (test explícito de RegistryClientError propagation desde nuevo paquete).

---

**Resumen**: Plan es sólido post-correction. 2 Critical hallazgos were caught y corregidos en planning stage, evitando explosiones en Fase 3. Mayor learning: error handling + dependencies en monorepos requieren verificación ANTES de architecture, no después. Red-team adversarial demostró valor (hallazgos accionables, no "risk flagging" vacío). Listo para `/ak:cook`.

---

**Nota organizacional**: Journal escrito en ubicación correcta (`plans/journals/260825-v11-phase2-planning-auto-seo-mcp-scope-freeze.md`). Skill "ak-project-organization" probablemente no aplicable (entrada única, directorio ya correcto). Si hay múltiples reports/outputs de esta sesión, podría evaluarse, pero para un journal singular no hay reorg necesaria.
