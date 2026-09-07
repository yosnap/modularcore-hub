---
title: "Contribuir"
description: "Cómo contribuir al repositorio de ModularCore Hub."
---

ModularCore Hub es un proyecto de código abierto y acepta contribuciones vía fork y Pull Request contra la rama `develop`. El flujo completo —requisitos previos, configuración del entorno, convenciones de commits, pruebas, changesets y checklist antes de abrir un PR— está documentado en detalle en [`CONTRIBUTING.md`](https://github.com/yosnap/modularcore-hub/blob/develop/CONTRIBUTING.md), en la raíz del repositorio.

En resumen: se requiere Node.js ≥ 22.13 y pnpm gestionado vía corepack, el trabajo se rama desde `develop` con el patrón `{tipo}/{slug}` (`feat/`, `fix/`, `docs/`…), los commits siguen Conventional Commits sin secretos ni referencias a asistentes de IA, y antes de abrir un PR debe pasar en limpio `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`.

## Aportar un componente: no hace falta cubrir todos los frameworks

El catálogo ofrece cada componente en varios frameworks, y ese es su valor: quien instala en
Angular espera lo mismo que quien instala en React. Pero exigir las seis adaptaciones a quien
aporta un componente sería un listón absurdo.

**Aporta los frameworks que domines** —uno basta— y dilo en el Pull Request. Completar el resto es
trabajo del mantenimiento. Lo único que se pide es que la cobertura quede declarada, para que nadie
descubra el hueco al instalar.

El descriptor separa dos ejes que no son el mismo:

- `frameworks` — dónde se puede **instalar** el componente. Exige núcleo headless y adaptador.
- `ui` — dónde hay además **componentes de interfaz**, y en cuáles de las cuatro presentaciones
  (`headless`, `tailwind`, `shadcn`, `vanilla`).

```json
"frameworks": ["react", "svelte", "vue"],
"ui": {
  "react": { "presentations": ["headless", "tailwind", "shadcn", "vanilla"] },
  "svelte": { "presentations": ["headless"], "missing": ["MediaLibraryModal"] },
  "vue": { "presentations": [] }
}
```

Un componente puede declarar `vue` y no traer UI: se instala en un proyecto Vue y el consumidor
monta su interfaz sobre el adaptador. Lo que no puede es callarse la diferencia — el catálogo
distingue visualmente un framework con UI de uno que sólo trae núcleo y adaptador.

### Si tu framework no está entre los seis

No hay lista blanca. El registry define React, Svelte, Vue, Angular, Blade y `vanilla` (páginas sin
framework), pero un componente puede traer el suyo y entra sin que el mantenimiento toque código:

```json
"frameworks": ["solid"],
"frameworkDefs": {
  "solid": {
    "title": "Solid",
    "uiExtension": ".tsx",
    "detect": { "npm": "solid-js" },
    "peer": "solid-js",
    "paths": { "components": "src/components", "lib": "src/lib/modularcore" }
  }
}
```

La definición aporta lo que el registry no puede deducir: la extensión de sus componentes, cómo se
reconoce un proyecto suyo y dónde se instalan las cosas. El control de qué entra en el catálogo es
la revisión del Pull Request, no una lista cerrada en el código.

Sí se comprueba que todo framework declarado tenga definición: una errata deja el componente
ininstalable y sus ficheros sin dueño, así que falla en CI.

Una comprobación del registry compara lo declarado con lo que hay y falla en los dos sentidos: si
aparece una brecha que nadie declaró, y si sigue declarada una que ya se cubrió. Así la deuda ni se
acumula en silencio ni sobrevive a su arreglo.

Para reportar un bug o pedir una funcionalidad, abre un [issue en el repositorio](https://github.com/yosnap/modularcore-hub/issues).
