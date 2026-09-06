---
'@modularcore/registry': minor
'@modularcore/cli': minor
---

Instalar sólo las dependencias npm que necesitan los ficheros que de verdad se escriben.

Los ficheros ya se recortaban al framework del proyecto, pero las dependencias no. `media-picker`
declara `bits-ui` —una librería de componentes que sólo existe para Svelte— y `@radix-ui/*` —sólo
para React—, así que instalarlo en un proyecto React metía `bits-ui` en su `package.json` aunque
ni un solo fichero de Svelte llegara a escribirse. Y como esos paquetes declaran su framework como
peer, la instalación podía fallar con `ERESOLVE` justo después de que el usuario confirmara.

La pertenencia no se declara en el descriptor: `dependenciesForFiles` la deduce de quién importa
qué, que es la verdad y no una etiqueta que alguien tenga que acordarse de mantener. Una
dependencia que **ningún** fichero del componente importa se conserva —puede cargarse
dinámicamente— porque ante la duda sobra una antes que falte una, igual que con los ficheros.

`AddResult` incluye ahora `npmDependenciesInstalled`, para que quien use la CLI vea qué se instaló
de verdad.
