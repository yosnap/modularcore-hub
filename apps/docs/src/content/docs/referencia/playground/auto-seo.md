---
title: "Playground: Auto SEO"
description: "Prueba en vivo el componente Auto SEO y genera JSON-LD válido para Schema.org."
---

Prueba el componente [Auto SEO](/referencia/componentes/auto-seo/) en vivo, directamente en tu
navegador, en:

**[modularcorehub.com/playground/auto-seo](https://modularcorehub.com/playground/auto-seo)**

Esta página de documentación no reimplementa la demo — la demo real vive en producción y se
mantiene junto al código del componente.

## Cómo funciona

Al ser un core puro sin efectos secundarios (`createSchema`, `createGraph`, `stringify`,
`validate`), la demo se ejecuta enteramente en el navegador, sin ningún backend propio: rellena
los campos de un tipo de Schema.org, genera el JSON-LD resultante y valida el resultado en tiempo
real.

Copia el componente a tu proyecto para generar datos estructurados en tus propias páginas —
consulta [la documentación del componente Auto SEO](/referencia/componentes/auto-seo/) para la
API completa.
