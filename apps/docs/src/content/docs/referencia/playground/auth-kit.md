---
title: "Playground: Auth Kit"
description: "Prueba en vivo el componente Auth Kit con hooks simulados en memoria, sin backend real."
---

Prueba el componente [Auth Kit](/referencia/componentes/auth-kit/) en vivo, directamente en tu
navegador, en:

**[modularcorehub.com/playground/auth-kit](https://modularcorehub.com/playground/auth-kit)**

Esta página de documentación no reimplementa la demo — la demo real vive en producción y se
mantiene junto al código del componente.

## Cómo funciona

La demo cablea `AuthKitHooks` contra una simulación en memoria: cualquier email/contraseña
funciona (tras un pequeño retardo artificial para poder ver los estados `submitting`), y puedes
forzar un error de credenciales para probar el estado de error de cada formulario. No hay
llamada de red ni backend real detrás — nunca conectes hooks así a producción.

Un selector de estilo cambia entre las cuatro presentaciones (headless, Tailwind, Shadcn, CSS
plano) sin perder el estado de los formularios, y otro selector activa/desactiva los campos
opcionales (nombre, apellidos, teléfono, checkbox legal, selector de tipo de perfil, Turnstile)
para ver cómo cambia `RegisterForm` según la configuración.

Para producción, copia el componente y conecta los hooks a tu backend o librería de
autenticación real — consulta [la documentación del componente Auth
Kit](/referencia/componentes/auth-kit/) para los ejemplos con Better Auth y con una API propia.
