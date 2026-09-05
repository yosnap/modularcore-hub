---
'@modularcore/media-picker': minor
---

Añadir un adaptador sin framework (`adapters/vanilla`) y declarar `vanilla` entre los frameworks
soportados del componente.

Los adaptadores existentes traducen el estado del núcleo al sistema reactivo de su framework y se
apoyan en su ciclo de vida para darse de baja. En una página sin framework no hay ninguno de los
dos, así que `createMediaPickerStore` expone `subscribe` —que invoca al oyente de inmediato con el
estado actual— y `destroy`, dejando la limpieza en manos de quien crea el store.

Habilita Astro, cuya interactividad son `<script>` con TypeScript plano y que hasta ahora no tenía
forma de usar el componente sin cargar React o Svelte solo para eso, y sirve igual en Blade, HTMX o
Rails. Incluye `snippets/astro/media-picker-island.ts` como montaje de referencia, con limpieza en
`astro:before-swap` para las View Transitions.
