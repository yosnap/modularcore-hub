// Enlaces externos y versiones que la cabecera y el pie muestran. Ambas versiones se leen de su
// fuente real —la doc se versiona por su cuenta en apps/docs/versions.json y no coincide con la
// del proyecto— para que nunca queden cableadas a mano en dos sitios.
import docsVersions from '../../../docs/versions.json';
import rootPkg from '../../../../package.json';

export const REPO_URL = 'https://github.com/yosnap/modularcore-hub';
export const DOCS_URL = 'https://docs.modularcorehub.com';

/** Versión publicada del sitio de documentación (independiente de la del proyecto). */
export const DOCS_VERSION = docsVersions.current;

/** Versión del proyecto ModularCore Hub, la que corresponde a esta web. */
export const APP_VERSION = rootPkg.version;
