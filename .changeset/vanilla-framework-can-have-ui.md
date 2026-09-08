---
'@modularcore/registry': patch
---

Permitir que el framework `vanilla` (sin framework) traiga UI de referencia propia, no solo
snippets — la trae `auth-kit`, con DOM imperativo en `ui/vanilla/*.ts`.

Sin este cambio, `ui/vanilla/…` se confundía con la presentación «CSS plano» de los demás
frameworks y se marcaba como fichero compartido: el recorte por framework de la CLI lo escribía en
toda instalación, incluida una de React, arrastrando un import a `adapters/vanilla/…` que esa
instalación no tiene. `blade` sigue sin poder declarar UI propia — se sirve con snippets, como
hasta ahora.
