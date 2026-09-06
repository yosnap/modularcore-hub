---
'@modularcore/registry': minor
---

Declarar la cobertura de la UI de referencia por framework, y comprobar que lo declarado es lo que
hay.

`frameworks` decía dónde se puede instalar un componente —núcleo y adaptador— y se leía como si
dijera dónde hay interfaz. No es lo mismo: `media-picker` declaraba `vue` y `angular` sin un solo
componente de UI, y `modals` entregaba en React sólo la presentación headless mientras en Svelte
tenía las cuatro. Nada lo señalaba hasta que alguien instalaba.

- `ui` en el descriptor declara, por framework, qué presentaciones cubre y qué componentes le
  faltan respecto a los demás, con nombre y apellido.
- `findCoverageMismatches` compara lo declarado con los ficheros del descriptor y falla en los dos
  sentidos: una brecha nueva que nadie declaró, y una brecha declarada que ya se cubrió.
- `RegistryIndexEntry` incluye `ui`, para que el catálogo distinga un framework con UI de uno que
  sólo trae núcleo y adaptador.

No exige paridad completa a quien aporta un componente: se aportan los frameworks que se dominan y
el resto queda declarado como trabajo pendiente.

De paso, dos correcciones en el recorte de ficheros por framework:

- La herencia entre frameworks se limita a los adaptadores. `blade` se apoya en el binding
  `vanilla` porque su plantilla lo monta, pero arrastraba también los snippets: un proyecto
  Laravel recibía la isla de Astro, cuyo único punto de entrada escucha `astro:page-load` y no se
  dispara jamás fuera de Astro.
- `ui/vanilla/` deja de tratarse como framework. `vanilla` nombra dos ejes —una página sin
  framework y la presentación de CSS plano— y bajo `ui/` manda el segundo: clasificarlo como
  framework habría borrado esos ficheros de toda instalación de React o Svelte.
