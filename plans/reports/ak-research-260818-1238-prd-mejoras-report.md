# Informe de Investigación: ModularCore Hub — Qué Mejorar, Cambiar y Quitar

**Fecha:** 2026-08-18 (rev. 2 — incorpora decisión del dueño del producto: CLI y MCP propios son canales core, no opcionales)
**PRD analizado:** `modularcore-hub.md` v1.0 (MVP) — 91 líneas, documento truncado (termina abruptamente a mitad del ejemplo de `registry.json`)
**Estado del código:** 0 líneas — repo vacío, solo existe el PRD

---

## 1. Resumen Ejecutivo

El PRD tiene visión sólida pero dos problemas: está **incompleto como documento** (falta la mitad: monetización, timeline, KPIs, riesgos, out-of-scope) y es **demasiado ambicioso como MVP** (6 componentes × 3-5 adaptadores × 4 canales de distribución).

Decisiones de producto confirmadas por el dueño (no negociables, orientan este informe):

- **Cero dependencia de gestores de componentes de terceros.** Los módulos deben funcionar en Webpack, Vite, o incluso como CSS/Tailwind + TS plano, sin ningún component manager. La distribución es copy-code de fuente pura.
- **CLI y MCP propios son canales de producto first-class.** El usuario se conecta al hub vía CLI (comandos: buscar, descargar, actualizar) o vía MCP (agentes IA en Cursor/Claude/etc.) y gestiona componentes de sus proyectos.
- **Angular entra en el roadmap de adaptadores (v1.1)** junto a Vue; Laravel/Blade y PHP se distribuyen como snippets (archivos planos) dentro de los paquetes del registry.
- **El chatbot del website es demo/playground** del componente AI Chat (con la OpenRouter key del dueño), documentando el cambio de proveedor estilo LiteLLM.
- **Operación del hub vía agentes:** el dueño podrá publicar/actualizar componentes desde Telegram/WhatsApp. Stack verificado: **Hermes Agent u OpenClaw** (mensajería) + **Multica** (orquestación de agentes) + MCP admin del hub. Ver §8.3.
- **Visión futura: componentes para frameworks agénicos** (LangChain/LangGraph) — p.ej. scraper de una web específica, generador de clips cortos de YouTube. Se anticipa en el diseño del schema (§8.4); no se construye en v1.
- **Visión futura: AI Voice Calls** — componente de llamadas telefónicas atendidas por IA, gestionado como **servicio hosted dentro de la web del hub** (no copy-code). Primer componente-servicio y candidato natural de monetización. §8.5.

Con esas decisiones, la arquitectura correcta es: **un Registry HTTP propio como única fuente de verdad, con Website, CLI y MCP como clientes delgados de esa API.** Compatibilidad con el schema shadcn se mantiene solo como *vista de exportación opcional* (interop gratis, sin dependencia).

Hallazgos de investigación que cambian el PRD:

1. **Lucia está DEPRECADA** (marzo 2025, lucia-auth.com). La opción "Better Auth / Lucia" ya no existe. Better Auth tiene plugin oficial de API Keys (`@better-auth/api-key`) con rate limiting, expiración y prefijos — resuelve PAT para CLI/MCP sin código custom.
2. **MCP es ecosistema maduro** (Claude, ChatGPT, VS Code, Cursor). Un MCP server propio sobre el registry es viable y diferencial: permite comandos tipo "actualiza mis componentes ModularCore" desde agentes IA.
3. **El schema registry de shadcn es referencia de diseño probada** (files/target/type, dependencies auto-instaladas, registryDependencies, auth por tokens) — copiar sus buenas ideas en schema propio, sin adoptar su tooling.

---

## 2. Metodología

- **Fuentes externas:** 5 oficiales — lucia-auth.com, better-auth.com/docs/plugins/api-key, modelcontextprotocol.io, ui.shadcn.com/docs/registry, ui.shadcn.com/docs/registry/mcp
- **Criterio:** YAGNI, KISS, DRY. Honestidad brutal sobre viabilidad.

---

## 3. Arquitectura de Distribución Propuesta

Principio rector: **los componentes son código fuente copiado al proyecto del usuario. Sin runtime del hub, sin gestor obligatorio, sin lock-in.** Funcionan con cualquier bundler o sin bundler.

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

**Por qué así:**

| Decisión | Razón |
| :--- | :--- |
| Registry = JSON + tarballs sobre HTTP | Cualquier cliente actual o futuro (CLI, MCP, IDE plugin, web) consume lo mismo. Un solo backend que mantener. |
| CLI y MCP delgados | Toda la lógica (resolver versión, dependencias entre componentes, env vars) vive en el servidor. Los clientes solo llaman endpoints → actualizar el catálogo no obliga a actualizar el CLI. |
| Export shadcn-compatible opcional | Es solo otra vista JSON del mismo registry. Si un usuario ya usa `npx shadcn add`, puede consumir ModularCore sin instalar nuestro CLI. Cuesta ~1 endpoint generado, no es dependencia. |
| Descarga manual (copy-paste / tarball) | Cubre "sin ningún gestor": el usuario copia los archivos desde la web y listo. Webpack/Vite/CSS plano — indiferente. |
| Canal admin para agentes (Telegram/WhatsApp) | Misma API/MCP con API key de scope admin → publicar/actualizar componentes desde un bot. Ver M16. |

---

## 4. Hallazgos de Investigación Externa (con evidencia)

### 4.1 Auth: Lucia muerta, Better Auth resuelve PAT nativamente

| Afirmación del PRD | Realidad verificada (ago 2026) |
| :--- | :--- |
| "Better Auth / Lucia" | **Lucia deprecada en marzo 2025.** Su autor la reemplazó con un archivo único educativo. No es opción. |
| "generación de Personal Access Tokens (PAT) para el CLI y MCP" | Better Auth tiene **plugin oficial `@better-auth/api-key`**: crear/verificar/revocar keys, expiración, rate limiting, prefijos custom, metadata, keys por organización. Cero código custom. |

**Decisión:** Better Auth + plugin api-key. Las keys autentican CLI y MCP contra el registry.

### 4.2 MCP: ecosistema maduro, canal real de producto

Verificado en modelcontextprotocol.io: MCP soportado por Claude, ChatGPT, VS Code, Cursor y más. El caso de uso para ModularCore es claro: el usuario le dice a su agente "instala el media-picker de ModularCore" o "actualiza mis componentes" → el agente llama al MCP server → el server resuelve contra el registry e inyecta archivos. shadcn demuestra el patrón a escala (122k stars, MCP propio para su registry).

**Diferencial de MCP propio vs reutilizar el de shadcn:** el de shadcn solo busca e instala. Uno propio puede: verificar versiones instaladas vs registry (`update check`), configurar `envVariables` interactivamente, y resolver dependencias entre componentes ModularCore. Eso justifica construirlo — es delgado sobre la API.

### 4.3 Qué copiar del schema shadcn (sin adoptar su tooling)

El `registry.json` del PRD va bien encaminado. Ideas probadas del schema shadcn a incorporar al schema propio:

| Idea | Valor |
| :--- | :--- |
| `files[].path` / `files[].target` / `files[].type` | Ya está en el PRD — correcto |
| `dependencies` (npm) auto-instaladas por el cliente | El CLI las instala al añadir el componente |
| `registryDependencies` | Componentes que dependen de otros componentes del hub (p.ej. chatbot depende de llm-core) |
| Auth por token en el registry | Base de componentes premium (monetización) |
| Todo servible como JSON estático | El registry puede generarse en build time → hosting barato, caché CDN |

---

## 5. QUITAR (eliminar del proyecto)

| # | Elemento | Justificación |
| :--- | :--- | :--- |
| Q1 | **Lucia** del stack | Deprecada marzo 2025. Texto muerto en el PRD. |
| Q2 | **Extensión de navegador (WXT)** | Canal sin caso de uso claro (¿qué hace un dev con un media-picker desde el popup del navegador?). Reevaluar post-product-market-fit. |
| Q3 | **Capa 3: Web Components para Laravel/PHP/WordPress** | Conceptualmente erróneo: WC corren en browser, no resuelven integración server-side de Blade/PHP. Un dev Laravel quiere un paquete Composer o snippets Blade, no Custom Elements. Eliminar la capa; los snippets Blade/PHP se distribuyen como archivos más del registry (un "framework" más del descriptor, sin capa especial). |
| Q4 | **Adaptadores Angular y Solid en v1** | El PRD los menciona en el resumen pero ni siquiera aparecen en el catálogo MVP. Coherencia: fuera. |
| Q5 | **Sitemap & Feed Builder del MVP** | Componente más commoditizado (next-sitemap, sitemap.js, plugins de Astro/Nuxt dominan). Menor valor diferencial. Post-MVP. |

---

## 6. CAMBIAR (ajustar lo que queda)

| # | Decisión actual (PRD) | Cambio propuesto | Razón |
| :--- | :--- | :--- | :--- |
| C1 | `registry.json` custom sin especificación completa (PRD truncado) | **Schema propio completo**, inspirado en shadcn (files/target/type, dependencies, registryDependencies) + `envVariables` (diferencial propio) + export opcional a formato shadcn | Completar la spec es bloqueante; copiar lo probado acelera; el export da interop sin dependencia. |
| C2 | "Better Auth / Lucia" | **Better Auth + `@better-auth/api-key`** | Lucia deprecada; plugin oficial resuelve PAT con rate limiting y expiración. |
| C3 | 4 canales (Web, CLI, Extensión, MCP) como piezas separadas | **1 API + 3 clientes delgados + descarga manual** (ver §3). Extensión fuera (Q2) | La lógica vive en el registry; CLI/MCP/web son vistas. Mantenimiento sostenible. |
| C4 | 6 componentes en MVP | **3 componentes: Media Picker, AI Chat (fusionado), Auto-Translator** | Ver §7. MVP realista de semanas, no de año y medio. |
| C5 | LLM Proxy y Chatbot como componentes separados | **Un solo componente `@modularcore/ai-chat`**: proxy = core headless, chatbot = capa UI | Eliminan superposición (streaming, system prompts, token counting duplicados). DRY. |
| C6 | Adaptadores: 3-5 por componente desde el día 1 | **Core TS + React y Svelte** en MVP; **Vue + Angular en v1.1**; snippets Blade/PHP como archivos planos del paquete | React = mayor mercado; Svelte = coherencia con el sitio propio; Angular = framework enterprise muy usado (el copy-code encaja bien con standalone components); Blade/PHP sin capa especial. |
| C7 | PostgreSQL + Drizzle desde el inicio | **Postergar DB** hasta features que la requieran (cuentas, keys, premium) | El registry es JSON generado en build. YAGNI: archivos bastan para v1. |
| C8 | "Dynamic Auto-Translator" con DeepL/LLMs gestionado por el hub | **BYOK (bring your own key)** + caché + detección + helpers i18n | Evita costos de API por contenido de terceros y problemas de licencias. |
| C9 | Turborepo sin versionado | **Turborepo + Changesets** desde el día 1 | Múltiples paquetes sin versionado automatizado = caos de releases. |
| C10 | Versionado de componentes no definido | **Versionado por componente en el registry** (`{name}@x.y.z`) + comando `update`/`diff` en CLI y MCP | El usuario posee código copiado: necesita saber qué cambió antes de re-copiar. Es promesa del canal CLI. |

---

## 7. Análisis Componente por Componente

| Componente | Veredicto | Acción | Prioridad |
| :--- | :--- | :--- | :--- |
| Universal Media Picker | **MANTENER — flagship** | Core + React + Svelte. Providers: empezar S3-compatible (cubre AWS + MinIO con una API) + Cloudinary. Azure post-MVP. | P0 |
| OpenRouter LLM Proxy | **FUSIONAR** (C5) | Core headless del chat unificado. | P0 |
| Drop-in Chatbot Engine | **MANTENER fusionado** | Markdown + streaming + function calling + historial (local o backend). Interfaz de proveedor agnóstica patrón LiteLLM (endpoint OpenAI-compatible): OpenRouter por defecto, LiteLLM proxy u otro proveedor cambiando solo config. Demo embebida en el website (playground con key del dueño). Diferencial vs AI Elements/assistant-ui: multi-framework real. | P0 |
| Auto-SEO & OpenGraph | **REDUCIR, post-MVP** | v1.1, solo JSON-LD primero. Valor: framework-agnóstico. | P1 |
| Sitemap & Feed Builder | **QUITAR del MVP** (Q5) | v2 si hay demanda. | P3 |
| Dynamic Auto-Translator | **MANTENER reducido** (C8) | BYOK + caché + helpers. Validar demanda vs i18next/Paraglide antes de construir. | P1 (condicional) |

---

## 8. MEJORAR / AGREGAR (lo que el PRD no tiene)

### 8.1 Secciones críticas ausentes del PRD

| # | Sección faltante | Contenido mínimo |
| :--- | :--- | :--- |
| M1 | **Modelo de negocio** | Recomendación: open-core. Registry público gratis + componentes premium con auth por token (el registry ya lo soporta por diseño). |
| M2 | **Usuario objetivo** | Indie hackers/agencias que integran storage/LLM/SEO repetidamente. NO enterprise en v1. |
| M3 | **Out of scope explícito** | No-objetivos: hosting de archivos, UI estilizada, plataforma SaaS de chatbots, soporte Angular/Solid, extensión de navegador. |
| M4 | **KPIs del MVP** | Definir números: installs/mes vía CLI, componentes publicados, proyectos reales usándolo. |
| M5 | **Timeline con milestones** | Ver §9. |
| M6 | **Análisis competitivo real** | Vercel AI SDK + AI Elements, assistant-ui, UploadThing/Uppy, next-sitemap ya existen. Diferencial: **multi-proveedor + multi-framework bajo una API, con distribución propia CLI/MCP**. Escribirlo explícitamente: orienta todas las decisiones. |
| M7 | **Estrategia de seguridad** | Credenciales de terceros (S3, LLM keys) nunca en el registry; `envVariables` → `.env.example` generado; servidor nunca persiste keys de usuarios finales. |
| M8 | **Política de versionado y updates** | Cómo recibe fixes quien ya copió código: `modularcore diff` / `modularcore update` (C10). Documentarlo como feature central. |
| M9 | **Docs y onboarding** | Docs con playground por componente = feature de adopción, no afterthought. |
| M10 | **PRD truncado** | Corta a mitad del §5. Completar: spec del descriptor, criterios de aceptación por componente, wireframes del catálogo. |

### 8.2 Mejoras técnicas

| # | Mejora | Detalle |
| :--- | :--- | :--- |
| M11 | **Website = Registry** | SvelteKit sirve catálogo visual Y endpoints `/registry/*.json` + tarballs. Una sola app. KISS. |
| M12 | **CLI delgado sobre HTTP** | Comandos: `add`, `list`, `search`, `update`, `diff`, `init` (detecta framework y configura). Toda la resolución en servidor. |
| M13 | **MCP delgado sobre HTTP** | Tools: `search_components`, `get_component`, `install_component`, `check_updates`. Misma API que el CLI. |
| M14 | **`envVariables` → `.env.example` automático** | Diferencial sobre cualquier registry: instalar un componente genera/append las vars documentadas. |
| M15 | **Playground por componente** | Demo en vivo por componente. El del AI Chat es el chatbot demo del sitio: usa la OpenRouter key del dueño y sirve de tutorial "cambia de proveedor sin tocar código" (docs estilo LiteLLM). Nota: LiteLLM es Python/proxy — el componente TS adopta el *patrón* (interfaz OpenAI-compatible + variable de endpoint), no la dependencia. |
| M16 | **Operación vía agentes (Telegram/WhatsApp/chat)** | Canal admin sobre la misma API/MCP con API keys con scopes. Stack concreto y flujo completo en §8.3. |

### 8.3 Canal de operación por agentes — stack concreto (verificado)

Productos confirmados por el dueño. Los tres son open-source/self-hostable — coherente con la filosofía anti-lock-in del proyecto:

| Pieza | Producto | Rol |
| :--- | :--- | :--- |
| Mensajería | **Hermes Agent** (Nous Research, MIT) u **OpenClaw** | El dueño habla por Telegram/WhatsApp/Signal/Discord/Slack/Email/CLI. Hermes aporta memoria persistente, skills auto-generadas y scheduling; OpenClaw es gateway mensajería↔agentes. Se solapan: elegir UNO para el MVP del canal. |
| Orquestación | **Multica** (open source, self-host o cloud) | Project management para equipos humano+agente: issues asignables a agentes, ciclo de vida de tareas (enqueue→claim→complete/fail), skills reusables, monitor de runtimes. Soporta Claude Code, OpenCode, OpenClaw, Codex, etc. |
| Ejecución | Runtimes gestionados por Multica (Claude Code, OpenCode, OpenClaw...) | El agente de código que realmente edita el componente, corre tests y abre el PR. |
| Puerta de enlace | **MCP admin del hub** + API keys con scopes (Better Auth api-key: p.ej. `components: ["publish","update"]`) | Tools: `publish_component`, `bump_version`, `check_status`. Interfaz controlada: el mundo exterior nunca toca el registry directamente. |
| Guardarraíl | CI/CD (GitHub Actions) | Nada entra a producción sin pipeline: validación de schema, tests, Changesets, build del registry. |

**Flujo "actualizar componente desde Telegram":**

1. Dueño → Hermes (Telegram): "sube una versión del media-picker con el fix del recorte en canvas".
2. Hermes crea el issue en Multica (operaciones simples tipo `check_status` pueden ir directas al MCP admin sin Multica).
3. Multica encola y asigna la tarea a un runtime (Claude Code / OpenCode / OpenClaw).
4. El agente ejecuta: edita código, corre tests, genera Changeset, abre PR.
5. CI valida. Hermes pide confirmación al dueño por Telegram (acciones destructivas: siempre en dos pasos).
6. Merge → rebuild del registry → nueva versión servida. Hermes reporta el resultado al chat.

**Notas:**
- Hermes/OpenClaw y Multica se solapan parcialmente (Multica también registra OpenClaw como runtime). Diseño recomendado: Hermes = interfaz de mensajería del dueño; Multica = cola y supervisión; runtime = el que ya se use para desarrollo.
- Dependencias: MCP propio (Fase 2) + CI/CD maduro → por eso vive en Fase 3.
- Riesgo asociado ya cubierto en §10 (operaciones destructivas vía bot).

### 8.4 Visión futura: componentes para frameworks agénicos (LangChain/LangGraph)

El modelo copy-code del registry es agnóstico de lenguaje y de target: un "componente" es archivos + descriptor. Eso habilita una familia futura de **agent tools** sin cambiar la arquitectura:

| Implicación de diseño | Detalle |
| :--- | :--- |
| Descriptor: campo `type` extensible | `frontend-component`, `headless-core`, `snippet`, y futuro `agent-tool` con `targets: ["langgraph", "langchain", "mcp"]`. Anticipar en la spec (C1) aunque no se use en v1. |
| Lenguaje | LangChain/LangGraph son Python-first; existen LangChain.js/LangGraph.js. Los componentes TS del hub encajan con las versiones JS. Snippets Python son posibles (el registry distribuye archivos, no binarios) pero fuera de la capa "headless TS core" — serían snippets documentados. |
| Sinergia MCP | Un tool de scraping o de clips puede exponerse también como tool del MCP server propio del hub → los agentes lo usan sin instalar nada. Componente (código copiado) y tool remoto (servicio) = dos sabores del mismo descriptor. |
| Ejemplos (del dueño) | Scraper de web específica (fetch + parseo + schema de salida tipado); generador de clips cortos de YouTube (descarga + ffmpeg + cortes automáticos). |

**Notas honestas:**
- **Scraping:** riesgo legal/ToS (robots.txt, términos del sitio, GDPR si hay datos personales). El componente documenta cumplimiento y la responsabilidad es del usuario.
- **Clips de YouTube:** descargar vídeos de YouTube viola sus ToS salvo contenido propio o con licencia — documentar casos de uso legítimos (los vídeos del propio usuario). Requiere ffmpeg/procesamiento pesado: el descriptor declara requisitos de infra (BYOI: bring your own infra) o se apoya en servicios externos; el hub no hostea transcodificación.

### 8.5 Visión futura: AI Voice Calls — primer componente-servicio (hosted)

Componente de llamadas telefónicas atendidas por IA, gestionado como **servicio dentro del website del hub**. Diferencia estructural con el resto del catálogo: no es copy-code — la telefonía, el audio en tiempo real y el STT/TTS requieren infra persistente que no se puede "copiar" como fuente.

| Aspecto | Diseño |
| :--- | :--- |
| Modelo | Dashboard web (crear agente, prompt, voz, número, logs de llamadas) + widget embebible para la web del cliente + backend de telefonía. |
| Multi-proveedor (diferencial ModularCore) | API unificada sobre Vapi / Retell / Bland / Twilio + OpenAI Realtime / ElevenLabs Conversational AI / LiveKit + Pipecat (open source). El usuario elige proveedor; el hub abstrae. Misma filosofía que el Media Picker con storage. |
| Encaje con arquitectura | Misma app SvelteKit (dashboard = rutas nuevas), misma auth (Better Auth + api-key), mismo patrón BYOK opcional. Aquí SÍ entra PostgreSQL + Drizzle (agentes, números, logs, consumo por minutos) — la DB postergada en C7 encuentra su momento. |
| Monetización | Candidato natural de servicio premium: pricing por minuto con margen sobre el coste del proveedor. Materializa M1. |
| Legal | Grabación de llamadas: consentimiento (GDPR, leyes de dos partes según jurisdicción), aviso obligatorio de "llamada atendida por IA", política de retención de datos. Configurable, conservador por defecto. |

---

## 9. Plan de Acción Priorizado

### Fase 0 — Specs y spikes (Semana 1-2)
1. Completar el PRD: M1-M5, M10 (documento truncado).
2. **Especificar el schema del registry propio** (C1) — bloqueante para todo.
3. Spike: endpoint SvelteKit sirviendo un componente de prueba + script mínimo que lo descargue e inyecte en un proyecto Vite+React y uno Svelte. Go/no-go.
4. Setup monorepo: pnpm + Turborepo + Changesets (C9). Sin DB (C7).

### Fase 1 — MVP (Semana 3-10)
1. Media Picker: core + S3-compatible + Cloudinary + React/Svelte.
2. AI Chat unificado: core (OpenRouter, streaming, tokens) + UI React/Svelte.
3. Registry + Website SvelteKit: catálogo, `/registry/*.json`, descarga manual, docs, playground.
4. **CLI propio** (M12): `init`, `add`, `list`, `update`. Publicado en npm.
5. Auth solo si entra premium: Better Auth + api-key (C2). Si todo gratis en MVP, saltar.

### Fase 2 — v1.1 (Semana 11-16)
1. **MCP server propio** (M13) sobre la misma API.
2. Adaptadores **Vue y Angular**; Azure Blob provider; snippets Blade/PHP como archivos planos.
3. Auto-SEO (JSON-LD). Auto-Translator si hay demanda validada.
4. Export shadcn-compatible (1 endpoint generado) como canal interop adicional.

### Fase 3 — v2+ (post product-market-fit)
Sitemap builder, monetización premium, **canal de operación por agentes (§8.3: Hermes/OpenClaw + Multica + Telegram/WhatsApp)** una vez estabilizados MCP + CI, IDE extensions si hay caso de uso demostrado.

### Fase 4 — Visión (backlog)
Familia **agent-tools** para LangChain/LangGraph (§8.4): scrapers de webs específicas, generador de clips cortos de YouTube, componentes expuestos como tools remotos del MCP del hub. **AI Voice Calls** (§8.5): primer componente-servicio hosted — requiere DB (C7), proveedores de voz/telefonía y marco legal de grabación.

---

## 10. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
| :--- | :--- | :--- | :--- |
| Mantener CLI + MCP propios cuesta de forma continua | Alta | Medio | Clientes delgados sobre la API (C3): la lógica vive en el servidor; los clientes raramente cambian. |
| Copia por competidores (código distribuido en claro) | Alta | Alto | Monetizar por conveniencia (premium, soporte), no por secreto. Decidir M1 antes de escribir código. |
| OpenRouter/DeepL/Cloudinary cambian APIs | Media | Medio | Adaptadores por proveedor aislados; contratos de tipos propios por encima. |
| Resolución de archivos destino falla en proyectos raros (monorepos, estructuras custom) | Media | Medio | `modularcore init` guarda config de paths por proyecto; target configurable por archivo. |
| Operación destructiva vía bot (publicar/borrar desde Telegram) | Media | Alto | Keys con scopes mínimos, confirmación en dos pasos para acciones destructivas, audit log, toda publicación pasa por CI (nunca escritura directa). |
| Scraping / descarga de YouTube: ToS y legalidad (Fase 4) | Media | Medio | Documentar casos de uso legítimos (contenido propio, CC, APIs oficiales), disclaimers, respeto de robots.txt por defecto, responsabilidad transferida al usuario. |
| Procesamiento de vídeo requiere infra pesada (ffmpeg, Fase 4) | Alta | Medio | El componente declara requisitos (BYOI) o usa servicios externos; el hub no hostea transcodificación. |
| Costes por minuto de voz (STT+LLM+TTS+telefonía) sin control (Fase 4) | Media | Alto | Límites por cuenta, alertas de gasto, opción BYOK para proveedores de voz. |
| Grabación de llamadas: cumplimiento legal (consentimiento, GDPR) (Fase 4) | Media | Alto | Aviso de IA obligatorio por defecto, consentimiento configurable por jurisdicción, política de retención, no grabar por defecto. |
| Scope creep (ambición del documento original) | Alta | Crítico | M3 (out of scope) como contrato: toda feature nueva requiere cambiar ese documento primero. |

---

## 11. Preguntas Sin Resolver

1. ¿Equipo y horas/semana reales disponibles? Toda la planificación depende de esto.
2. ¿Open-core con premium, o todo OSS con servicios hosted después? (M1)
3. ¿El PRD original tiene más contenido en otra fuente? El `.md` está truncado a mitad del §5.
4. Auto-Translator: ¿demanda real que i18next/Paraglide no cubran? Sin evidencia, no construir.
5. ¿El registry necesita componentes de terceros (terceros publicando en el hub) algún día? Afecta al diseño del schema y la auth.
6. ~~multika/hermes/open cloud~~ **RESUELTA:** Multica (orquestación), Hermes Agent (agente multi-canal), OpenClaw (gateway). Spec en §8.3. Única decisión menor pendiente: ¿Hermes u OpenClaw como gateway del MVP del canal? (se solapan).

---

## 12. Referencias

- lucia-auth.com — anuncio de deprecación (marzo 2025, sitio actualizado julio 2026)
- better-auth.com/docs/plugins/api-key — plugin oficial API keys (v1.6)
- modelcontextprotocol.io — ecosistema de clientes MCP (Claude, ChatGPT, VS Code, Cursor)
- ui.shadcn.com/docs/registry — schema registry multi-framework (referencia de diseño)
- ui.shadcn.com/docs/registry/mcp — patrón de MCP server sobre registry
- multica.ai — orquestador open-source de equipos humano+agente (22 runtimes soportados)
- hermes-agent.nousresearch.com — agente personal MIT multi-canal (Telegram, WhatsApp, Signal, Discord, Slack, Email, CLI)
