---
title: "Errores del CLI"
description: "Tipos de error reales del CLI de ModularCore Hub y cómo resolverlos."
---

El CLI distingue entre errores deliberados (validaciones conocidas) y excepciones inesperadas. Los primeros se muestran como un mensaje limpio con el prefijo `[modularcore]`; los segundos muestran la traza completa porque indican un fallo no previsto. Esta página documenta los errores deliberados, agrupados por su causa real en el código.

## `CliError` — errores generales de configuración y ejecución

- **`No se encontró "modularcore.json" en <ruta>. Corre \`modularcore init\` primero.`**
  Cualquier comando que no sea `init` necesita que el proyecto ya esté inicializado. Ejecuta `modularcore init` en la raíz del proyecto antes de `add`, `list`, `update` o `diff`.

- **`"<ruta>" no es JSON válido: <detalle>`**
  El `modularcore.json` existente está corrupto o mal editado a mano. Corrige el JSON manualmente o vuelve a generarlo con `modularcore init`.

- **`"<ruta>" no tiene el formato esperado (registryUrl/framework/paths/installed).`**
  El `modularcore.json` es JSON válido pero le faltan campos requeridos. Revisa que conserve las cuatro claves: `registryUrl`, `framework`, `paths` e `installed`.

- **`Operación cancelada por el usuario. No se escribió ningún archivo.`**
  Respondiste "no" a la confirmación de `modularcore add`. No es un fallo: ningún archivo se escribió ni se instaló ninguna dependencia. Vuelve a ejecutar `add` cuando quieras confirmar.

- **`No se pudo ejecutar "<gestor> <args>": <detalle>`** / **`"<gestor> <args>" terminó con código <código>.`**
  El gestor de paquetes (npm/pnpm/yarn, detectado automáticamente en tu proyecto) falló al instalar las dependencias npm del componente. Revisa el detalle del error: suele ser un problema de red, de registro npm privado, o de una versión de dependencia inexistente.

- **`No se pudo crear backup ".orig" de "<ruta>": <detalle>`**
  `modularcore update` no pudo escribir la copia de seguridad antes de sobrescribir un archivo local. Comprueba permisos de escritura en el directorio de destino.

## `CompatibilityError` — el componente no encaja en tu proyecto

- **`"<componente>" no soporta el framework de este proyecto ("<framework>"). Frameworks soportados: <lista>.`**
  El componente no declara soporte para el framework configurado en `modularcore.json`. Revisa el catálogo (`modularcore search`) para ver si hay una variante compatible.

- **`"<componente>" requiere el peer dependency "<paquete>" (<rango>), pero no está declarado en el package.json de este proyecto.`**
  Instala el peer dependency requerido (por ejemplo, `react` o `svelte`) en tu proyecto antes de reintentar `add`.

- **`"<componente>" requiere "<paquete>" <rango>, pero este proyecto declara "<paquete>" <versión instalada>.`**
  La versión instalada del peer dependency no satisface el rango que exige el componente. Actualiza (o fija) la versión del paquete en tu proyecto para que quede dentro del rango indicado.

- **`Dependencia "<paquete>" no declara versión pineada/semver (formato esperado "nombre@rango").`** / **`Dependencia "<paquete>" tiene un rango semver inválido: "<rango>".`**
  El descriptor del componente en el registry tiene una dependencia mal formada. Esto es un problema del propio componente publicado, no de tu proyecto: repórtalo como issue.

- **`Conflicto de versiones para "<paquete>": "<versión A>" vs "<versión B>" entre componentes resueltos. Resuélvelo manualmente en los descriptores.`**
  Dos componentes que estás instalando en la misma operación (por dependencias entre componentes) requieren rangos distintos del mismo paquete npm. El CLI no elige uno por ti; instala los componentes por separado o repórtalo si crees que ambos deberían converger.

## `DependencyCycleError` — dependencias circulares entre componentes

- **`Ciclo detectado en registryDependencies: A -> B -> A`**
  Dos o más componentes del registry se declaran como dependientes entre sí formando un ciclo. Es un error en la publicación de esos componentes, no algo que puedas resolver desde el proyecto consumidor: repórtalo como issue con la cadena de componentes que muestra el mensaje.

## Errores de `@modularcore/registry-client` que verás a través del CLI

El CLI también reenvía, con el mismo formato limpio, los errores que produce la conexión al registry (fallo de red, 404, JSON inválido, descriptor con formato incorrecto). Consulta el detalle en [Solución de problemas · Registry](/solucion-de-problemas/registry/).

## Ver también

- [Instalar un componente](/guias/instalar-un-componente/) para el flujo completo de `add` y en qué punto aparece cada uno de estos errores.
