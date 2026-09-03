---
title: "Contribuir"
description: "Cómo contribuir al repositorio de ModularCore Hub."
---

ModularCore Hub es un proyecto de código abierto y acepta contribuciones vía fork y Pull Request contra la rama `develop`. El flujo completo —requisitos previos, configuración del entorno, convenciones de commits, pruebas, changesets y checklist antes de abrir un PR— está documentado en detalle en [`CONTRIBUTING.md`](https://github.com/yosnap/modularcore-hub/blob/develop/CONTRIBUTING.md), en la raíz del repositorio.

En resumen: se requiere Node.js ≥ 22.13 y pnpm gestionado vía corepack, el trabajo se rama desde `develop` con el patrón `{tipo}/{slug}` (`feat/`, `fix/`, `docs/`…), los commits siguen Conventional Commits sin secretos ni referencias a asistentes de IA, y antes de abrir un PR debe pasar en limpio `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`.

Para reportar un bug o pedir una funcionalidad, abre un [issue en el repositorio](https://github.com/yosnap/modularcore-hub/issues).
