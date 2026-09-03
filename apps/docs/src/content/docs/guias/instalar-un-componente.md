---
title: "Instalar un componente"
description: "Guía paso a paso para incorporar un componente a tu proyecto con `modularcore add`."
---

Esta guía describe, paso a paso, qué ocurre exactamente al ejecutar `modularcore add`. Requiere que el proyecto ya esté inicializado (`modularcore init`), es decir, que exista un `modularcore.json` en la raíz.

## 1. Resolución de dependencias entre componentes

```bash
modularcore add auto-seo
```

El CLI lee `modularcore.json` para conocer el framework del proyecto y las rutas de destino configuradas. A partir de ahí, resuelve recursivamente las `registryDependencies` del componente pedido: si `auto-seo` dependiera de otro componente del hub, ese componente se resuelve también, en orden de dependencias primero. Si detecta un ciclo entre componentes, la instalación se detiene con un error explícito en lugar de entrar en un bucle infinito.

## 2. Comprobación de compatibilidad

Antes de escribir cualquier archivo, para cada componente resuelto el CLI comprueba:

- Que el componente declara soporte para el framework de tu proyecto (o que es agnóstico de framework).
- Que los peer dependencies que requiere (por ejemplo, una versión de React o Svelte) están declarados en tu `package.json` y satisfacen el rango semver exigido.

Si algo no encaja, la instalación se detiene con un error de compatibilidad antes de tocar el disco. Ver [Solución de problemas · CLI](/solucion-de-problemas/cli/) para el detalle de estos mensajes.

## 3. Confirmación de dependencias npm

Si el componente (o alguno de sus `registryDependencies`) declara dependencias npm, el CLI las lista y pide confirmación explícita antes de instalarlas:

```
Se instalarán las siguientes dependencias npm (--ignore-scripts)
zod@^4.4.3

¿Instalar 1 dependencia(s) con npm y escribir los archivos de "auto-seo"?
```

Si respondes que no, la operación se cancela y no se escribe ningún archivo. Las dependencias se instalan con `--ignore-scripts` como medida de seguridad.

## 4. Copia de archivos

Una vez confirmado, el CLI copia los archivos de cada componente resuelto a las rutas configuradas en `init`, remapeando el destino de cada archivo según la configuración de rutas del proyecto. Si algo falla a mitad de la copia, el CLI informa exactamente qué archivos ya se escribieron antes del fallo, para que puedas revisar el estado parcial sin adivinar.

## 5. Variables de entorno

Para cada componente instalado, el CLI añade (o crea) las variables de entorno que documenta en `.env.example` — nunca en `.env`, y nunca con valores reales: las credenciales no viajan por el registry. Revisa `.env.example` después de instalar y completa los valores reales en tu `.env` local.

## 6. Registro en `modularcore.json`

Al terminar, el CLI actualiza la sección `installed` de `modularcore.json` con el nombre y la versión de cada componente instalado. Este registro es lo que usan `modularcore update` y `modularcore diff` para saber qué tienes instalado.

## Ver también

- [Actualizar componentes](/guias/actualizar-componentes/) para volver a sincronizar un componente ya instalado con el registry.
- [Solución de problemas · CLI](/solucion-de-problemas/cli/) para el detalle de los errores que puede mostrar `add`.
