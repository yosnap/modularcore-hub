# syntax=docker/dockerfile:1

# `canvas` has native build dependencies in this workspace. Debian's glibc image is more
# portable in CI/Easypanel than Alpine's musl image for that dependency.
FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json vitest.workspace.ts ./
COPY apps/web/package.json ./apps/web/package.json
# `--frozen-lockfile` exige el manifiesto de TODOS los importers del lockfile, incluido el
# sitio de documentación, aunque esta imagen no lo construya.
COPY apps/docs/package.json ./apps/docs/package.json
COPY packages ./packages

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
# Fuente única de la versión publicada de la documentación, que la web enlaza y muestra.
COPY apps/docs/versions.json ./apps/docs/versions.json
COPY assets ./assets

# Run the workspace pipeline so registry assets are generated before SvelteKit builds. Acotado a
# `web` y sus dependencias: el sitio de documentación es otro servicio (ver Dockerfile.docs) y su
# código no está en esta imagen, así que incluirlo en el pipeline rompería el build.
RUN pnpm build --filter web...

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/apps/web/build ./
COPY --from=build /app/apps/web/registry-data ./registry-data

EXPOSE 3000

CMD ["node", "index.js"]
