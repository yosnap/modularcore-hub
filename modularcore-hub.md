# Documento de Requisitos del Producto (PRD)

**Nombre del Proyecto:** ModularCore Hub
**Tipo de Producto:** Plataforma de componentes funcionales headless agnósticos con distribución propia multicanal (Web/Registry, CLI y Servidor MCP).
**Versión:** 1.1 (MVP) — sustituye a v1.0 (documento truncado a mitad del §5)
**Estado:** Aprobado para Desarrollo
**Última actualización:** 2026-08-18 — integra las decisiones del informe `plans/reports/ak-research-260818-1238-prd-mejoras-report.md`

---

## 1. Resumen Ejecutivo y Propuesta de Valor

ModularCore Hub es un repositorio y ecosistema de distribución para **componentes funcionales headless (sin diseño forzado)**. A diferencia de librerías visuales como shadcn UI, Radix o Tailwind UI que resuelven estilos y accesibilidad básica, ModularCore resuelve la **lógica de negocio compleja y multi-proveedor**:

* Gestión unificada de almacenamiento (AWS S3, MinIO, Cloudinary, Azure Blob).
* Chatbot/proxy LLM con streaming, herramientas (function calling) e historial, con proveedor intercambiable (OpenRouter por defecto).
* Agentes de SEO automatizados para metadatos y schemas estructurados.
* Motores dinámicos de traducción (BYOK) y generadores de sitemaps.

**Diferencial central:** unificar SDKs multi-proveedor bajo una API común multi-framework, con **distribución propia** vía CLI y MCP.

```
Antes: 4 SDKs de storage × 3 frameworks = 12 integraciones
Después: 1 componente ModularCore × 3 frameworks = 3 integraciones
```

---

## 2. Principios de Diseño (no negociables)

1. **Cero dependencia de gestores de terceros.** Los componentes son código fuente copiado al proyecto del usuario (copy-code): funcionan en Webpack, Vite o sin bundler; sin runtime del hub; sin component manager obligatorio.
2. **CLI y MCP propios son canales de producto first-class**, no infraestructura opcional.
3. **Una API, clientes delgados.** Toda la lógica (versiones, dependencias entre componentes, env vars) vive en el Registry HTTP; Web, CLI y MCP solo la consumen.
4. **Multi-proveedor como diferencial.** Cada componente abstrae N proveedores bajo una interfaz; el usuario elige (y cambia) por configuración.
5. **YAGNI, KISS, DRY.** Sin features sin demanda validada; el MVP es pequeño a propósito.

---

## 3. Stack Tecnológico

| Capa / Módulo | Tecnología | Justificación |
| :--- | :--- | :--- |
| Plataforma Web + Registry | **SvelteKit 5 (Runes)** | Una sola app = catálogo visual + endpoints del registry (`/registry/*.json` + tarballs). SSR rápido, bundle mínimo. |
| Monorepo | **pnpm Workspaces + Turborepo + Changesets** | Caché compartida + versionado semántico automatizado de paquetes desde el día 1. |
| Base de Datos & ORM | **PostgreSQL + Drizzle ORM — POSTERGADO** | El registry es JSON generado en build; no hace falta DB en v1. Entra cuando lleguen cuentas/premium; imprescindible para AI Voice Calls (Fase 4). |
| Autenticación & API Keys | **Better Auth + `@better-auth/api-key`** | Lucia está **deprecada** (marzo 2025) — descartada. El plugin oficial api-key da PAT para CLI/MCP con rate limiting, expiración, prefijos y scopes, sin código custom. |
| CLI de Distribución | **Node.js + Commander + Clack** (propio, npm) | Canal core: `init`, `add`, `list`, `search`, `update`, `diff`. Cliente delgado sobre la API. |
| Protocolo IA (MCP) | **`@modelcontextprotocol/sdk`** (servidor propio) | Canal core: agentes en Cursor/Claude/VS Code/ChatGPT instalan y actualizan componentes. Tools admin para operación (§13). |
| Extensión de Navegador | **ELIMINADA del roadmap cercano** | Sin caso de uso claro para el usuario del producto. Reevaluar solo post-product-market-fit. |

---

## 4. Arquitectura del Sistema

**Un Registry HTTP como única fuente de verdad; todos los canales son clientes delgados.**

```
                ┌──────────────────────────────────┐
                │   REGISTRY HTTP API (SvelteKit)  │  ← ÚNICA fuente de verdad
                │   GET /registry/index.json       │     (catálogo + versiones)
                │   GET /registry/{name}.json      │     (descriptor + archivos)
                │   GET /registry/{name}.tar.gz    │     (descarga directa)
                │   Auth: API keys (Better Auth)   │
                └───┬────────┬────────┬────────┬───┘
                    │        │        │        │
              ┌─────▼───┐ ┌──▼─────┐ ┌▼───────┐ ┌▼────────────────┐
              │ Website │ │  CLI   │ │  MCP   │ │ Export opcional │
              │ catálogo│ │ propio │ │ propio │ │ schema shadcn   │
              │ + docs  │ │ (npm)  │ │ (sdk)  │ │ (interop gratis)│
              └─────┬───┘ └──┬─────┘ └┬───────┘ └─────────────────┘
                    │        │        │
              copiar a mano  │   agentes IA
              / curl (sin    │   (Cursor, Claude,
              ningún gestor) │    VS Code, ChatGPT)
                             │
                    add / list / update / diff
```

### Capas de los componentes

1. **Core agnóstico (TypeScript / Web Standards):** lógica pura con APIs web universales (`fetch`, `ReadableStream`, `FormData`, `Canvas API`), sin dependencias visuales.
2. **Adaptadores reactivos:** wrappers delgados — Hooks (React), Runes (Svelte) en MVP; Composables (Vue) y standalone components (Angular) en v1.1.
3. ~~Web Components / Custom Elements~~ **ELIMINADA.** Los WC corren en browser y no resuelven integración server-side. Laravel Blade / PHP se distribuyen como **snippets (archivos planos)** dentro de los paquetes del registry, sin capa especial.

---

## 5. Catálogo de Componentes

### MVP (Fase 1)

| Componente | Proveedores / Capacidades | Frameworks |
| :--- | :--- | :--- |
| **Universal Media Picker** (flagship) | Subida local, URL remota, biblioteca. Recorte y compresión en canvas. Providers: **S3-compatible (cubre AWS + MinIO con una API) + Cloudinary**; Azure Blob en v1.1. Presets por rol. | React, Svelte |
| **AI Chat** (fusión de OpenRouter LLM Proxy + Drop-in Chatbot Engine en un solo componente) | Core headless: streaming, fallback entre modelos, token counting, system prompts, function calling, historial (local o backend). UI: render Markdown/código. **Proveedor agnóstico estilo LiteLLM**: endpoint OpenAI-compatible configurable — OpenRouter por defecto; LiteLLM proxy, OpenAI directo u otro, cambiando solo config. Demo embebida en el website (playground con la key del dueño, sirve de tutorial de cambio de proveedor). | React, Svelte, Web |

### Condicional (entra al MVP solo si se valida demanda)

| Componente | Condición | Frameworks |
| :--- | :--- | :--- |
| **Dynamic Auto-Translator** | Solo si hay evidencia de demanda que i18next/Paraglide no cubran. Alcance reducido: **BYOK** (DeepL/LLM del propio usuario) + caché local + detección de idioma + helpers i18n. | Client Core, i18n Helpers |

### v1.1 (Fase 2)

| Componente / Ampliación | Detalle |
| :--- | :--- |
| **Auto-SEO & OpenGraph** | Alcance reducido inicial: generación JSON-LD (Schema.org) primero; keywords y Social Card preview después. Valor: framework-agnóstico. |
| Adaptadores **Vue** y **Angular** | Se añaden a los componentes P0 existentes. |
| **Azure Blob** provider | Cuarto provider del Media Picker. |
| Snippets **Blade/PHP** | Archivos planos dentro de los paquetes del registry. |

### Post-MVP / Visión

| Componente | Fase | Nota |
| :--- | :--- | :--- |
| **Sitemap & Feed Builder** | Fase 3 | Mercado commoditizado (next-sitemap, sitemap.js); solo si hay demanda. |
| **Agent-tools** (scrapers, generador de clips YouTube) | Fase 4 | §14.1. |
| **AI Voice Calls** (llamadas atendidas por IA) | Fase 4 | §14.2 — primer componente-servicio hosted. |

---

## 6. Sistema Escalable para Nuevos Componentes (Registry Declarativo)

Para agregar nuevos componentes sin modificar la base de datos ni la interfaz web manualmente, se utiliza un **Registro Declarativo Central basado en código**. Schema **propio** (inspirado en el probado por shadcn, sin adoptar su tooling) con **export opcional** a formato shadcn-compatible como vista generada del mismo registry (interop gratis, sin dependencia).

### Descriptor del componente (`{name}.json`)

```json
{
  "name": "media-picker",
  "version": "1.2.0",
  "title": "Universal Media Manager",
  "type": "frontend-component",
  "category": "storage",
  "frameworks": ["react", "svelte"],
  "dependencies": ["browser-image-compression"],
  "registryDependencies": [],
  "envVariables": [
    { "key": "STORAGE_ENDPOINT", "description": "URL de S3 o MinIO", "required": true },
    { "key": "STORAGE_BUCKET", "description": "Nombre del bucket", "required": true }
  ],
  "files": [
    { "path": "core/media-picker.ts", "target": "lib/modularcore/media-picker.ts", "type": "core" },
    { "path": "adapters/svelte/MediaPicker.svelte", "target": "components/MediaPicker.svelte", "type": "adapter" },
    { "path": "snippets/blade/media-picker.blade.php", "target": "resources/views/components/media-picker.blade.php", "type": "snippet" }
  ]
}
```

### Reglas del schema

* **`type` extensible** (anticipado desde v1, aunque no se use todo): `frontend-component`, `headless-core`, `snippet`, y futuro `agent-tool` con `targets: ["langgraph", "langchain", "mcp"]` (§14.1).
* **`dependencies`**: paquetes npm que el CLI/MCP instala automáticamente al añadir el componente.
* **`registryDependencies`**: componentes del hub de los que depende (p.ej. un futuro `ai-chat-voice` dependería de `ai-chat`).
* **`envVariables`**: diferencial propio — al instalar, el CLI/MCP genera o hace append a `.env.example` con las vars documentadas. Las credenciales **nunca** viajan en el registry.
* **`version`**: versionado semántico por componente (§12).
* **Servible como JSON estático** generado en build → hosting barato, caché CDN.

### Endpoints del registry

| Endpoint | Descripción |
| :--- | :--- |
| `GET /registry/index.json` | Catálogo completo: nombre, título, categoría, versión, frameworks, descripción. |
| `GET /registry/{name}.json` | Descriptor completo + contenido de archivos. |
| `GET /registry/{name}.tar.gz` | Descarga directa (canal manual / curl). |
| `GET /r/{name}.json` (opcional) | Export shadcn-compatible del mismo descriptor. |
| Auth (cuando haya premium) | API keys vía Better Auth; componentes premium bajo token. |

---

## 7. Canales de Distribución

| Canal | Estado | Detalle |
| :--- | :--- | :--- |
| **Website (catálogo + registry)** | MVP | Catálogo visual, docs, playground por componente (el del AI Chat es el chatbot demo con la OpenRouter key del dueño). Sirve los endpoints del registry. |
| **CLI propio** | MVP | `modularcore init` (detecta framework, guarda paths en config del proyecto), `add`, `list`, `search`, `update`, `diff`. Publicado en npm. Cliente delgado sobre la API. |
| **Descarga manual** | MVP | Copiar archivos desde la web o `curl` del tarball. Cubre "sin ningún gestor". |
| **MCP propio** | Fase 2 | Tools: `search_components`, `get_component`, `install_component`, `check_updates`. Misma API que el CLI. Diferencial vs MCP de terceros: updates, env vars y dependencias entre componentes. |
| Export shadcn-compatible | Fase 2 | Un endpoint generado. Interop para quien ya use `npx shadcn add`; no es dependencia. |
| Extensión de navegador | **Eliminada** | Reevaluar solo post-product-market-fit con caso de uso demostrado. |

---

## 8. Modelo de Negocio

**Open-core.** Decisión a validar en Fase 0, propuesta base:

* **Gratis (crecimiento):** registry público, CLI, MCP, componentes core (Media Picker, AI Chat).
* **Premium (ingresos):** componentes avanzados bajo registry auth (token), plantillas/snippets pro, soporte.
* **Servicios hosted (futuro, mayor margen):** AI Voice Calls (§14.2) con pricing por minuto; tools remotos del MCP (§14.1).
* **Nunca:** vender secretos — el código se distribuye en claro; se monetiza conveniencia y servicio.

---

## 9. Usuario Objetivo y Out of Scope

**Usuario:** indie hackers y agencias que integran storage/LLM/SEO repetidamente en proyectos React/Svelte/Vue/Angular y backends clásicos (Laravel). **No** enterprise en v1.

**Out of scope (contrato anti-scope-creep — toda feature nueva requiere editar esta lista):**

* Hosting de archivos o transcodificación de media.
* UI estilizada / temas visuales (somos headless a propósito).
* Plataforma SaaS de chatbots (vendemos el engine, no la plataforma).
* Adaptadores Solid/Qwik; extensión de navegador.
* Soporte de frameworks agénicos Python (LangChain/LangGraph) como core — solo snippets (Fase 4).
* Fine-tuning o gestión de modelos.

---

## 10. KPIs del MVP

* 500 installs/mes vía CLI a los 3 meses del lanzamiento público.
* 2-3 componentes publicados con docs y playground.
* 5 proyectos reales usándolo en producción (case studies públicos).
* Ratio issues cerrados/abiertos ≥ 80%.
* < 5 min desde `init` hasta componente funcionando (medido en tests de onboarding).

---

## 11. Seguridad

* **Credenciales de terceros (S3, LLM keys) nunca en el registry.** Se declaran en `envVariables` y el install genera `.env.example`; el usuario las pone en su `.env`.
* El servidor **nunca persiste keys de usuarios finales**; BYOK donde aplique.
* API keys del hub con **scopes mínimos** (Better Auth: `permissions` por key, p.ej. `components: ["read"]` vs `["publish","update"]`).
* Rate limiting en endpoints del registry (incluido en el plugin api-key).
* Operaciones admin (publicar/borrar) solo vía CI con aprobación (§13).

---

## 12. Versionado y Política de Updates

* Versionado semántico **por componente** (`{name}@x.y.z`), gestionado con Changesets en el monorepo.
* El usuario posee el código copiado: recibe fixes vía **`modularcore diff`** (ve qué cambió) y **`modularcore update`** (re-inyecta archivos, con confirmación archivo a archivo). Mismas operaciones disponibles vía MCP.
* Changelog público por componente en el website.
* Breaking changes: solo en majors, con guía de migración en el descriptor del componente.

---

## 13. Operación del Hub vía Agentes (Fase 3)

El dueño podrá publicar/actualizar componentes desde Telegram/WhatsApp mediante agentes. Stack (todo open-source/self-hostable, coherente con §2):

| Pieza | Producto | Rol |
| :--- | :--- | :--- |
| Mensajería | **Hermes Agent** (Nous Research, MIT) u **OpenClaw** | Interfaz Telegram/WhatsApp/Signal/Discord/Slack/Email/CLI. Se solapan: elegir UNO para el MVP del canal (decisión pendiente). |
| Orquestación | **Multica** | Issues asignables a agentes (Claude Code, OpenCode, OpenClaw...), ciclo de vida de tareas, skills, monitor de runtimes. |
| Ejecución | Runtimes de Multica | El agente de código que edita, testea y abre el PR. |
| Puerta de enlace | **MCP admin del hub** + API keys con scopes | Tools: `publish_component`, `bump_version`, `check_status`. |
| Guardarraíl | **CI/CD** | Nada entra a producción sin pipeline (validación de schema, tests, Changesets, build del registry). |

**Flujo:** dueño escribe por Telegram → Hermes crea issue en Multica (o llama directo al MCP admin si es `check_status`) → runtime ejecuta (código + tests + Changeset + PR) → CI valida → Hermes pide confirmación (destructivas: siempre dos pasos) → merge → registry rebuild → confirmación al chat.

**Regla de oro:** el agente **nunca escribe directo a producción**; todo pasa por CI.

---

## 14. Visión Futura (Fase 4)

### 14.1 Agent-tools (LangChain/LangGraph)

Familia de componentes tipo `agent-tool` (ya anticipado en el schema, §6): scrapers de webs específicas (fetch + parseo + schema de salida tipado), generador de clips cortos de YouTube (descarga + ffmpeg + cortes).

* **Lenguaje:** TS sobre LangChain.js/LangGraph.js; snippets Python posibles como archivos documentados (fuera del core headless).
* **Sinergia MCP:** un tool puede exponerse como tool remoto del MCP del hub → agentes lo usan sin instalar nada. Componente (código copiado) y tool remoto (servicio) = dos sabores del mismo descriptor.
* **Notas legales/infra:** scraping bajo responsabilidad del usuario (robots.txt, ToS, GDPR); clips de YouTube solo para contenido propio/CC (ToS); ffmpeg = BYOI (bring your own infra) o servicios externos — el hub no hostea transcodificación.

### 14.2 AI Voice Calls — primer componente-servicio (hosted)

Llamadas telefónicas atendidas por IA, gestionado como **servicio dentro del website del hub** (no copy-code: telefonía y audio en tiempo real requieren infra persistente).

* **Modelo:** dashboard (crear agente, prompt, voz, número, logs) + widget embebible + backend de telefonía.
* **Multi-proveedor:** API unificada sobre Vapi / Retell / Bland / Twilio + OpenAI Realtime / ElevenLabs / LiveKit+Pipecat.
* **Encaje:** misma SvelteKit + Better Auth; **aquí entra PostgreSQL + Drizzle** (agentes, números, logs, consumo por minutos) — la DB postergada en §3.
* **Monetización:** pricing por minuto con margen sobre coste de proveedor.
* **Legal:** aviso obligatorio de "llamada atendida por IA", consentimiento de grabación por jurisdicción (GDPR), no grabar por defecto.

---

## 15. Análisis Competitivo

| Competidor | Qué hace | Diferencial de ModularCore |
| :--- | :--- | :--- |
| shadcn/ui, Radix, Tailwind UI, Headless UI | Componentes visuales/primitivas | ModularCore: lógica de negocio multi-proveedor, no UI. |
| Vercel AI SDK + AI Elements, assistant-ui | Chatbot UI + streaming (React) | ModularCore: multi-framework real + historial backend-agnostic + CLI/MCP propios. |
| UploadThing, Uppy, FilePond | Uploads de archivos | ModularCore: 4 providers de storage bajo una API + recorte/compresión + multi-framework. |
| next-sitemap, sitemap.js | Sitemaps por framework | Por eso Sitemap es post-MVP: mercado commoditizado. |
| i18next, Paraglide | i18n | Por eso Translator es condicional: solo si hay gap real. |
| Vapi, Retell, Bland (Fase 4) | Voice AI como servicio | ModularCore abstrae varios bajo una API + dashboard propio. |

**El diferencial nunca es el componente individual: es multi-proveedor + multi-framework + distribución propia (CLI/MCP) bajo una API común.**

---

## 16. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
| :--- | :--- | :--- | :--- |
| Mantener CLI + MCP propios cuesta de forma continua | Alta | Medio | Clientes delgados sobre la API: la lógica vive en el servidor. |
| Copia por competidores (código en claro) | Alta | Alto | Monetizar conveniencia/servicio, no secretos (§8). |
| Proveedores (OpenRouter, Cloudinary...) cambian APIs | Media | Medio | Adaptadores aislados por proveedor; contratos de tipos propios. |
| Resolución de paths en proyectos raros (monorepos) | Media | Medio | `init` guarda config de paths; `target` configurable por archivo. |
| Scope creep | Alta | Crítico | §9 Out of Scope como contrato: toda feature nueva edita esa lista primero. |
| Operación destructiva vía bot (Fase 3) | Media | Alto | Scopes mínimos, confirmación en dos pasos, audit log, todo pasa por CI. |
| Legal scraping/YouTube (Fase 4) | Media | Medio | Casos de uso legítimos documentados, disclaimers, robots.txt por defecto. |
| Costes por minuto de voz sin control (Fase 4) | Media | Alto | Límites por cuenta, alertas, BYOK. |
| Grabación de llamadas: cumplimiento legal (Fase 4) | Media | Alto | Aviso de IA obligatorio, consentimiento configurable, no grabar por defecto. |

---

## 17. Roadmap

### Fase 0 — Specs y spikes (Semana 1-2)
1. Validar modelo de negocio (§8) y cerrar out-of-scope (§9).
2. **Especificar el schema del registry completo (§6)** — bloqueante.
3. Spike: endpoint SvelteKit sirviendo un componente de prueba + script que lo inyecta en Vite+React y en Svelte. Go/no-go.
4. Setup monorepo: pnpm + Turborepo + Changesets. Sin DB.

### Fase 1 — MVP (Semana 3-10)
1. Media Picker: core + S3-compatible + Cloudinary + React/Svelte.
2. AI Chat: core (OpenRouter, streaming, tokens, function calling) + UI React/Svelte + demo en la web.
3. Registry + Website: catálogo, endpoints, descarga manual, docs, playgrounds.
4. CLI propio: `init`, `add`, `list`, `update`, `diff`.
5. Auth solo si entra premium en MVP; si no, saltar.

### Fase 2 — v1.1 (Semana 11-16)
1. MCP server propio (tools de lectura/instalación).
2. Adaptadores Vue y Angular; Azure Blob; snippets Blade/PHP.
3. Auto-SEO (JSON-LD). Auto-Translator solo si demanda validada.
4. Export shadcn-compatible (1 endpoint).

### Fase 3 — v2 (post product-market-fit)
Sitemap builder, monetización premium, **canal de operación por agentes (§13)** una vez estabilizados MCP + CI.

### Fase 4 — Visión (backlog)
**Agent-tools** (§14.1): scrapers, clips de YouTube, tools remotos del MCP. **AI Voice Calls** (§14.2): requiere DB, proveedores de voz/telefonía y marco legal.

---

## 18. Referencias

* Informe de investigación que origina esta versión: `plans/reports/ak-research-260818-1238-prd-mejoras-report.md`
* lucia-auth.com — deprecación de Lucia (marzo 2025)
* better-auth.com/docs/plugins/api-key — plugin oficial API keys
* modelcontextprotocol.io — ecosistema MCP
* ui.shadcn.com/docs/registry — referencia de diseño del schema
* multica.ai — orquestación de agentes · hermes-agent.nousresearch.com — agente multi-canal · OpenClaw — gateway mensajería
