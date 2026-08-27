# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json vitest.workspace.ts ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

# Run the workspace pipeline so registry assets are generated before SvelteKit builds.
RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/apps/web/build ./

EXPOSE 3000

CMD ["node", "index.js"]
