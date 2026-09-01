---
title: "Hello Core"
description: "Componente mínimo de plantilla usado internamente para probar el pipeline de copiado de la CLI de ModularCore."
---

`@modularcore/hello-core` no es un componente pensado para uso productivo en una aplicación: es un
componente mínimo de ejemplo/plantilla que sirve para probar (spike) el pipeline de inyección
copy-code de la CLI de ModularCore antes de que un componente real pase por él.

## Código

Todo el paquete se reduce a una única función framework-agnóstica:

```ts
/** Trivial framework-agnostic export used to spike the copy-code injection pipeline. */
export function helloModularCore(name: string = 'world'): string {
  return `Hello, ${name}! (from @modularcore/hello-core)`;
}
```

## Metadatos del componente (`modularcore.json`)

El manifiesto que consume la CLI declara este componente como una plantilla interna, no como parte
del catálogo público:

- `type`: `headless-core`
- `category`: `spike`
- `visibility`: `internal`
- `frameworks`: `react`, `svelte` (declarados a efectos de prueba del pipeline, sin adaptadores
  reales en el paquete)
- Sin `peerDependencies`, sin `dependencies` ni `registryDependencies`.
- Un único fichero copiable: `src/hello.ts` → se instala en
  `src/modularcore/hello-core/hello.ts` en el proyecto destino.

## Para qué sirve

Al no tener lógica de negocio ni UI, Hello Core permite verificar de extremo a extremo que la CLI
resuelve el manifiesto, copia el fichero declarado a la ruta destino correcta y respeta la
codificación (`utf8`) — sin el ruido de un componente real con adaptadores, estilos o proveedores.
No tiene playground asociado ni README propio.
