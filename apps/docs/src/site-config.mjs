// Constante única de site/base — Fase 5 (freeze-version.mjs) importa esto mismo para derivar
// el prefijo de reescritura de enlaces, en vez de cablear "/" en dos sitios (red-team Finding 5/10).
//
// ASUNCIÓN PENDIENTE DE VERIFICAR (Fase 1/S1, requiere acceso al dashboard de Easypanel — no
// ejecutable de forma autónoma): se asume la respuesta (a) — dominio propio sin upgrade de plan.
// Si S1 determina B2 (servir bajo modularcorehub.com/docs), cambiar SITE/BASE aquí y no en ningún
// otro sitio.
export const SITE = 'https://docs.modularcorehub.com';
export const BASE = undefined; // '/docs' si S1 = B2

// Enlaces externos del sitio, en un solo sitio para que la cabecera (social de Starlight) y el
// pie no se desincronicen.
export const REPO_URL = 'https://github.com/yosnap/modularcore-hub';
export const WEB_URL = 'https://modularcorehub.com';
