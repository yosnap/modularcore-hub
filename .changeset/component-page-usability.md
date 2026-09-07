---
'web': patch
---

Arreglar cuatro problemas de la ficha de componente.

- **La tabla de instalación manual listaba los archivos de todos los frameworks juntos**: 89 filas
  en `media-picker`, la mayoría inútiles para quien lo instala. Ahora hay una pestaña por
  framework, con el mismo recorte que aplica la CLI, así que cada una enseña exactamente lo que
  llegaría: 48 en React, 52 en Svelte, 19 en Vue.
- **El comando decía `https://TU_HOST`**, que había que sustituir a mano. Ahora sale el host desde
  el que se está mirando la página; al prerenderizar, el dominio público.
- **La documentación se mostraba en inglés**: la ficha leía el `README.md` del paquete, escrito
  para quien trabaja dentro del monorepo. Se prefiere ahora la referencia de `apps/docs`, que está
  en español y dirigida a quien va a usar el componente. El README queda de respaldo.
- **El Markdown se veía casi en crudo**, con las almohadillas de los títulos y los guiones de las
  listas a la vista. Se usaba el renderizador de `@modularcore/ai-chat`, pensado para mensajes de
  chat: hace código, negrita y enlaces, y nada más. `renderDocsMarkdown` cubre además títulos,
  listas, párrafos y citas, y la ficha tiene ya estilos para distinguir código, títulos y enlaces
  del texto corrido.

El renderizador escapa todo el texto antes de añadir marcado y descarta cualquier `href` que no
sea http(s) o un ancla: la documentación puede venir del README de un componente aportado desde
fuera, así que no es contenido de confianza.
