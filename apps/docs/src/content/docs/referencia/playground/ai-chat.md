---
title: "Playground: AI Chat"
description: "Prueba en vivo el componente AI Chat usando la clave de OpenRouter de cortesía del proyecto."
---

Prueba el componente [AI Chat](/referencia/componentes/ai-chat/) en vivo, directamente en tu
navegador, en:

**[modularcorehub.com/playground/ai-chat](https://modularcorehub.com/playground/ai-chat)**

Esta página de documentación no reimplementa la demo — la demo real vive en producción y se
mantiene junto al código del componente.

## Cómo funciona

La demo es un chat con streaming real, servido a través del endpoint propio `/api/chat` de
`modularcorehub.com`. Ese endpoint inyecta, en el servidor, una **API key de OpenRouter del propio
proyecto** como cortesía para que puedas probar el componente sin necesidad de tu propia cuenta ni
credenciales. La clave nunca se expone al navegador.

Al ser una clave compartida entre todos los visitantes del playground, el endpoint aplica **límites
de uso compartidos** (rate limiting) para mantener la demo disponible para todo el mundo. Si
recibes un error de límite alcanzado, espera unos segundos y vuelve a intentarlo.

Para tu propia aplicación, copia el componente y usa tu propia clave (directamente o, mejor, a
través de tu propio proxy en servidor) — consulta [la documentación del componente AI
Chat](/referencia/componentes/ai-chat/) para el patrón BYOK (Bring Your Own Key).
