## Qué y por qué

<!-- Describe el cambio y su motivación. -->

## Cobertura por framework

<!--
  Sólo si el PR aporta o cambia un componente. Bórralo si no aplica.

  No hace falta que cubras todos los frameworks: aporta los que domines y di aquí cuáles
  faltan — completarlos es trabajo del mantenimiento. Lo único que pedimos es que `ui` en el
  `modularcore.json` del componente diga la verdad, para que nadie descubra el hueco al instalar.
-->

- Frameworks que trae este PR:
- Frameworks que quedan por adaptar:
- ¿Hay algún equivalente que no exista en otro framework (una dependencia de UI, una primitiva)?

## Checklist

- [ ] La rama parte de `develop` y el PR apunta a `develop`.
- [ ] Commits en formato Conventional Commits, sin secretos ni referencias a IA.
- [ ] Se añadieron/actualizaron pruebas para el cambio.
- [ ] Se añadió un changeset si el cambio afecta a un paquete publicable.
- [ ] El PR trata un solo tema y su descripción explica el *qué* y el *porqué*.
- [ ] Si este PR cambia el comportamiento de CLI, MCP o Web, se ha actualizado `apps/docs` en este mismo PR (o se justifica abajo por qué no aplica).
- [ ] Si el PR toca un componente, `ui` en su `modularcore.json` refleja la cobertura real: presentaciones que trae y, con nombre, lo que queda por adaptar.

Ver [`CONTRIBUTING.md`](../CONTRIBUTING.md#checklist-antes-de-abrir-un-pull-request) para el detalle de cada punto, y [Aportar un componente](../CONTRIBUTING.md#aportar-un-componente-cobertura-por-framework) para cómo se declara la cobertura.
