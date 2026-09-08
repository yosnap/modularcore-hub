// Enlaces externos y versiones que la cabecera y el pie muestran. Ambas versiones se leen de su
// fuente real —la doc se versiona por su cuenta en apps/docs/versions.json y no coincide con la
// del proyecto— para que nunca queden cableadas a mano en dos sitios.
import docsVersions from '../../../docs/versions.json';
import rootPkg from '../../../../package.json';

export const REPO_URL = 'https://github.com/yosnap/modularcore-hub';

// En dev, el enlace a "Documentación" debe apuntar al `astro dev` local (puerto por defecto de
// Astro) en vez de a producción — de lo contrario, comprobar cambios de la doc en local siempre
// te sacaba del entorno que estabas probando. `import.meta.env.DEV` es la forma estándar de Vite
// de distinguir `vite dev` de `vite build`; en producción esto sigue siendo la URL pública.
export const DOCS_URL = import.meta.env.DEV
  ? 'http://localhost:4321'
  : 'https://docs.modularcorehub.com';

/** Versión publicada del sitio de documentación (independiente de la del proyecto). */
export const DOCS_VERSION = docsVersions.current;

/** Versión del proyecto ModularCore Hub, la que corresponde a esta web. */
export const APP_VERSION = rootPkg.version;
