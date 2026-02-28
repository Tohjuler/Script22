FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json biome.json bts.jsonc ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile

FROM base AS build-api
RUN cd apps/server && bun run build

FROM base AS build-web
RUN cd apps/web && bun run build

FROM oven/bun:1.3.10-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-api /app/apps/server/dist/server.js ./server.js

EXPOSE 3000
CMD ["bun", "run", "./server.js"]

FROM oven/bun:1.3.10-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-web /app/apps/web/dist ./dist
COPY --from=build-web /app/apps/web/server.ts ./server.ts

EXPOSE 3001
CMD ["bun", "run", "./server.ts"]
