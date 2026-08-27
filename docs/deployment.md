# Despliegue

## Plataforma: Easypanel

El destino es el proyecto `iservisat` y el servicio `modularhub`. La aplicación desplegable es
`apps/web`, una aplicación SvelteKit con `adapter-node`. El `Dockerfile` de la raíz construye el
monorepo con pnpm y deja una imagen de ejecución mínima que escucha en el puerto `3000`.

## Configuración del servicio

- **Origen:** `https://github.com/yosnap/modularcore-hub.git`.
- **Rama inicial:** `chore/easypanel-deployment` mientras se valida; después la rama de
  integración aprobada.
- **Tipo de build:** Dockerfile.
- **Archivo Dockerfile:** `Dockerfile`.
- **Puerto interno:** `3000`.
- **Comando:** dejar vacío; la imagen ejecuta `node index.js`.
- **Health check:** `GET /` en el puerto `3000`.
- **Volúmenes:** ninguno. La aplicación y el registry son de solo lectura en tiempo de ejecución.

## Variables globales

No se requieren variables globales en Easypanel. La imagen define internamente el modo de
producción, el host y el puerto `3000`; el servicio debe conservar su entorno global actual sin
reemplazarlo.

El endpoint opcional `/api/chat` no estará disponible mientras no se configure de forma explícita
una clave del proveedor de IA. `docs/mcp-data.md` está ignorado para impedir que la URL local de
conexión MCP se publique por accidente.

## Verificación previa

```bash
pnpm install --frozen-lockfile
pnpm build
```

Easypanel debe completar un despliegue desde el Dockerfile y servir la URL configurada por el
dominio del servicio. Tras el primer despliegue, comprobar la portada.

## Reversión

En Easypanel, seleccionar el último despliegue correcto del servicio y usar **Redeploy**. Para
volver a una revisión concreta, restaurar la rama Git a ese commit y desplegarla de nuevo.
