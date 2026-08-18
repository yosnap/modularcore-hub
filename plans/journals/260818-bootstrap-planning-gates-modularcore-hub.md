# Bootstrap Completado: Planning + Gates Revelan Riesgos Reales en Copy-Code Model

**Fecha**: 2026-08-18 19:55
**Severidad**: Medium (riesgos encontrados, decisión explícita del usuario de mantener scope)
**Componente**: ModularCore Hub MVP Fase 1 (architecture, security, CI/CD planning)
**Estado**: Completado (cambios sin commitear; aguardando GitHub remoto)

## Qué Pasó

Completamos el ciclo completo bootstrap→brainstorm→plan→gates sin implementar código.

1. **Reutilizamos contrato de brainstorm** del PRD `modularcore-hub.md` (outcome, constraints, non-goals, acceptance criteria). NO re-litigamos research ni tech-stack (ya validados en `ak-research-260818-1238`).

2. **Tres decisiones de scope del usuario** (explícitas, no negociables):
   - MVP Fase 1 **completo**: Media Picker + AI Chat + Registry + Website + CLI
   - **SIN auth ni DB**: Registry público, JSON estático
   - Website **mínimo** (sin wireframes, sin precalentamiento)

3. **Plan multi-fase creado** vía `ak plan create`: 6 fases, 35 tasks. Ruta crítica: Monorepo Foundation (pnpm+Turborepo+Changesets+Vitest+CI) → Registry Schema+Build Spike → {CLI, Media Picker, AI Chat paralelos} → Website.

4. **Branching strategy documentada** (docs/branching-release-strategy.md): feature→develop→main; main solo por release+tag (v0.1..v0.6 por fase). Reconciliados ejes de versión: git tags vs Changesets por-paquete.

5. **Tres gates de calidad ejecutados**: validate (6 decisiones) → predict (5 personas, 4 recomendaciones aplicadas + 1 opcional) → red-team (4 revisores hostiles, 27 hallazgos).

## La Verdad Brutal

El red-team **encontró vulnerabilidades REALES** en el copy-code model que el usuario decidió **mantener aceptando el riesgo**.

La sorpresa: el riesgo no vive en los componentes (Svelte runes, React hooks copiados). **Vive en los bordes**: CLI ↔ filesystem (exfiltración de secretos) y builder ↔ registry (inyección de contenido en componentes públicos). La "caja negra segura" de copy-code **requiere guardrails militares en el cliente**, no solo en el código copiado.

Dos Critical flagrados:
- **SA1** (Security/Architecture): `path` en el builder DEBE estar clampéado (no solo en CLI) contra exfiltración de secretos del runner al registry PÚBLICO. Usuario aceptó; aplicado al plan Fase 1.
- **AD1** (Architecture/Dependency): Sin peerDependencies ni versión de framework → runes Svelte5/hooks React copiados rompen en proyectos incompatibles. Schema del descriptor ampliado; CI/testing debe validar contra versiones mínimas.

Otros 17 técnicos High aceptados y aplicados: postinstall RCE en add (--ignore-scripts), path traversal en CLI, tool_calls sin validar (SSRF), cache Turbo del registry, hello-core fugándose a producción, changeset version repo-wide rompiendo versionado por fase, colisión de pnpm-lock, encoding base64 de files[], canvas phantom en jsdom, divergencias OpenAI-compatible, contrato del historial backend, SSRF en URL remota, Cloudinary firmado por defecto, engines node>=18.

**GRUPO B rechazado** (8 hallazgos de alcance): usuario honró sus decisiones explícitas → ambos flagship completos, smokes bloqueantes en CI, mantiene vanilla web + biblioteca + presets + search + type cerrado.

## Detalles Técnicos

**Path-clamp en builder** (SA1):
```
El registry retorna componentes con paths relativos.
El builder DEBE validar: path no asciende (/../), no absoluto, no symlink.
Ejemplo: "src/hooks/useState.js" OK; "../secrets/.env" BLOQUEADO en builder, no solo CLI.
```

**Descriptor schema ampliado**:
```json
{
  "visibility": "public|internal",
  "peerDependencies": { "svelte": ">=5.0", "react": ">=18" },
  "encoding": "utf-8|base64"
}
```

**CI/smokes bloqueantes**:
- Requiere `CLOUDINARY_API_KEY`, `OPENROUTER_API_KEY` (secretos en GitHub Actions)
- MinIO local para test S3 (hook getUploadUrl)
- Smoke tests EXTERNOS (no mocks) → validación real de cadena end-to-end

## Qué Intentamos

1. **Predict mitigation**: 4 recomendaciones aplicadas (peerDeps, guardrails CLI path, hardening proxy chat, DRY resolve+write module).
2. **Red-team adversarial**: 4 revisores hostiles escribiendo contra el plan. Simularon escenarios: fork del repo con CI keys, componentes maliciosos en registry, historial backend sin validación, cache Turbo compartida.
3. **User decision loop**: Usuario revisó Group A (técnico, aplicado) vs Group B (alcance, rechazado). Mantuvo MVP completo = más valor + más riesgo (asumido).

## Análisis de Causa Raíz

El modelo copy-code **hereda el riesgo de la Web2 copy-paste**: el usuario recibe código sin auditar y lo integra en su build. La diferencia es que **aquí el código viene de un servidor público sin auth**. La cadena de riesgo:

1. Registry HTTP público → metadata + files
2. Builder local descarga + valida schema
3. Builder injerta archivos en workspace → build
4. CLI maneja paths/filesystem → inyección accidental en registry

**Falta de peerDependencies** amplifica: runes Svelte5 copiadas en proyecto React18 compilarán "bien" (JS válido) pero fallarán en runtime. La confianza del usuario en el código copiado es ilusoria.

## Lecciones Aprendidas

1. **Copy-code no es copy-paste**: requiere validación **trifásica** (descriptor schema, builder path-clamp, CLI idempotencia). Una sola barrera rota = exfiltración.

2. **Los bordes son el ataque**: no inviertas en seguridad de componentes si el cliente↔registry↔builder son puertas abiertas.

3. **Smoke tests bloqueantes son no-negociables** cuando secrets/external services están en juego. Mocks esconden bugs reales.

4. **Versionado por-paquete + git tags deben reconciliarse TEMPRANO**: changeset version repo-wide es una trampa cuando fases se executan secuencialmente.

5. **Aceptar riesgo explícitamente > intentar mitigarlo silenciosamente**: el usuario eligió MVP completo a costa de Surface Attack. Eso es válido si está documentado.

## Siguientes Pasos

1. **GitHub remoto**: crear repo, configurar branch protection (develop + main). SIN remote aún → PRs/releases/CI pendientes.
2. **Plan changes sin commitear**: usuario eligió "termino aquí". Cambios (plan.md, 6 fases, branching-doc, report red-team) en working tree, no commiteados. Next action: usuario decide si commitear o iterar antes.
3. **CI secrets**: Fase 1 CI requerirá `CLOUDINARY_*` + `OPENROUTER_API_KEY` en GitHub Actions Secrets.
4. **Spike Registry Fase 2**: builder path-clamp + schema validation son bloqueantes go/no-go. Si fallan, copy-code model no es viable.
5. **Audit peerDependencies**: antes de que Media Picker/AI Chat sean públicos, documentar compatibilidad de versión de framework.

---

**Resumen**: El plan es válido y riesgos están identificados/aceptados. El reto real no es el código copiado; es asegurar que los guardrails en CLI↔builder↔registry aguanten el peso. Red-team entregó. Ahora es ejecución.
