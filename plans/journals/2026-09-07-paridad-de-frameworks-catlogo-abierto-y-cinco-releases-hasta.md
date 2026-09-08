---
title: "Paridad de frameworks, catálogo abierto y cinco releases hasta producción"
date: 2026-09-07
summary: "De revisar tres PRs de media-picker a abrir el catálogo de frameworks del registry, con cinco releases hasta v0.10.5 verificados en producción."
---

# Paridad de frameworks, catálogo abierto y cinco releases hasta producción

## Punto de partida

La tarea empezó como algo acotado: revisar tres PRs pendientes de mejoras del `media-picker`
(#29, #30, #31). Se fusionaron sin incidentes. Pero al pedirme que revisara si `bits-ui` sólo
funcionaba para Svelte, la conversación derivó en el objetivo real del repositorio: **paridad
entre frameworks**. Lo que un componente ofrece en un framework debe ofrecerlo en todos los que
declara, sin que eso se convierta en una barrera para quien contribuye.

## Decisiones de diseño, en el orden en que se tomaron

1. **La paridad es deuda declarada, no un requisito de entrada.** El usuario lo dejó claro
   explícitamente: "si un usuario sube un componente en Angular, nosotros nos encargamos del
   resto [...] eso el usuario no puede ser bloqueante". Se implementó `ui` en el descriptor,
   separado de `frameworks`: el primero dice dónde hay UI de referencia y qué falta (con nombre),
   el segundo dice dónde se puede instalar. Una comprobación de CI falla en los dos sentidos —
   brecha nueva sin declarar, y brecha declarada que ya se cubrió— porque en la práctica lo
   segundo se olvida más que lo primero.

2. **Una captura por componente**, para que quien revisa una PR de un framework que no puede
   ejecutar tenga al menos un indicio visual. No va en `files[]` (eso lo copia la CLI al proyecto
   del consumidor); vive aparte y el build la sirve por su cuenta.

3. **El catálogo de frameworks se abrió del todo**, tras una pregunta directa: "¿cómo permitimos
   que se suban componentes Solid o Qwik? ¿simplemente que lo suban y ya se muestra
   automáticamente, o hay un proceso detrás?". La respuesta honesta era que sí había proceso —
   cuatro sitios de código cerrados— y que aceptar un framework sin poder compilarlo ni probarlo
   era asumir mucho. El usuario decidió igualmente abrirlo: "lo aceptamos, ya que siempre vamos a
   revisar". Se implementó `frameworkDefs` en el descriptor: un componente aporta su propia
   definición (extensión de UI, cómo se detecta, su peer, sus rutas) y el registry + la CLI lo
   tratan como a los seis de casa, sin tocar código nuestro.

## Lo que costó de verdad: fallos propios encontrados por la revisión, no por mí

Esta sesión tuvo un patrón que merece quedar escrito porque se repitió varias veces: **la
revisión (`/code-review`) encontró fallos míos que yo no vi**, algunos serios.

- **Pérdida de datos silenciosa.** Aprobé la PR #31 con `overwriteKey` propagándose de la subida
  original a cada derivada. Como `overwriteKey` significa "escribe en esta clave exacta", cada
  miniatura generada acababa pisando el archivo original — sin ningún error visible, porque la
  clave devuelta seguía apuntando ahí. Estuvo en producción desde v0.10.1 hasta que la revisión
  de una rama distinta lo señaló.
- **Un "detalle menor" que no lo era.** En la misma revisión marqué como no bloqueante que
  `Blob.type` vacío no caía al valor de reserva (`??` en vez de `||`). Consecuencia real: la
  "miniatura" salía en PNG sin pérdida, más pesada que el JPEG que se suponía debía reducir.
- **Arreglar un hallazgo introdujo otro peor.** Al corregir que `preview.image` se validaba sin
  reglas de ruta relativa, cambié la validación en los dos esquemas del registry sin ver que el
  campo tiene dos formas distintas (ruta en el descriptor, URL ya servida en el índice). El
  resultado: el esquema del índice rechazaba la salida de su propio build. En cuanto un
  componente hubiera declarado una captura, `RegistryClient.getIndex()` y `getDescriptor()`
  habrían roto contra **todo** el catálogo, no sólo ese componente. Lo atrapó la siguiente ronda
  de revisión antes de fusionar.
- **El arreglo estrella habría sido un no-op en producción.** Se cambió la ficha de componente
  para leer la referencia en español de `apps/docs` en vez del README en inglés del paquete. El
  build local lo mostraba perfecto. Lo que no vi: el `Dockerfile` de la app `web` sólo copia
  `package.json` y `versions.json` de `apps/docs`, no el contenido real de las referencias.
  `import.meta.glob` no encuentra nada y no da error — cae en silencio al README en inglés. Sólo
  se detectó construyendo la imagen Docker real y sirviendo la ficha desde un contenedor, que es
  la verificación que debí hacer desde el principio y no hice hasta que la revisión lo señaló.
- **Publicar un conflicto de merge en producción.** Al resolver a mano el merge de la PR #31,
  quedó un bloque `<<<<<<< HEAD ... >>>>>>> origin/develop` entero dentro de una página de
  `apps/docs`, publicado tal cual en docs.modularcorehub.com durante días. Ningún control lo
  detectó porque el markdown con marcadores sigue siendo markdown válido y ningún test leía ese
  fichero.

Cada uno de estos se corrigió y se le añadió una salvaguarda estructural (no sólo el parche
puntual): una prueba que recorre el árbol de fuentes buscando marcadores de conflicto, una
prueba que pasa la salida real del build por los esquemas que la van a leer, verificación con
imagen Docker real antes de dar por bueno un arreglo de contenido.

## Bloqueo real: OTP con llave de seguridad

Los cuatro paquetes públicos (`cli`, `mcp-server`, `registry`, `registry-client`) llevaban desde
v0.10.1 sin publicarse a npm — tres versiones minor de desfase entre el repo y lo que cualquiera
instalaba. Al intentar publicar, ni `pnpm exec changeset publish` ni `npm publish` a través de
esta sesión pudieron completar el 2FA de la cuenta, que es una llave de seguridad WebAuthn: ese
flujo necesita un navegador atado a una sesión de terminal genuinamente interactiva, algo que ni
el `!` de esta sesión ni un `run_in_background` pueden ofrecer. Tuvo que ejecutarlo el usuario
directamente en su propia terminal, paquete por paquete, aprobando cada vez con la llave. Verificado
después contra la API cruda del registro (`registry.npmjs.org`), no contra `npm view` local, que
se había quedado con caché stale y hacía parecer que uno de los cuatro no se había publicado.

## Resultado

Doce PRs revisadas y fusionadas, cinco releases (v0.10.1 a v0.10.5) hasta `main`, con
verificación en producción en cada uno: página en vivo comprobada por HTTP, no sólo el build.
Estado final: 0 PRs abiertas, 0 issues, `develop` y `main` alineados, los cuatro paquetes
públicos publicados y al día en npm.

## Decisión pendiente, explícitamente aparcada

Queda abierta la deuda de UI por framework documentada en
`plans/260906-1730-paridad-frameworks/`: Vue y Angular sin un solo componente de interfaz en
`media-picker`, `MediaLibraryModal` sólo en Svelte, `modals` con las presentaciones de tailwind/
shadcn/vanilla ausentes en React, y `ai-chat` sin ninguna UI de referencia. El andamiaje ya
existe (comprobación de cobertura, catálogo abierto); lo que falta es el trabajo mecánico de
escribir cada adaptador.

## Próximos pasos

- Adaptar `MediaLibraryModal` a React (la brecha declarada más pequeña).
- Llevar las tres presentaciones que faltan de `modals` a React, reutilizando el patrón de las
  de Svelte como referencia literal.
- Decidir el equivalente de la presentación `shadcn` para Vue y Angular antes de escribir su UI
  (no hay equivalente directo de `bits-ui`/`@radix-ui` en esos ecosistemas).
- Considerar automatizar la verificación con imagen Docker real como paso de CI, no sólo como
  verificación manual puntual — el hallazgo del Dockerfile habría llegado antes.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
