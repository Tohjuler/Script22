FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json biome.json bts.jsonc ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile

FROM base AS build
RUN bun run build

FROM oven/bun:1.3.10-alpine AS app
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/server/server.js ./server.js
COPY --from=build /app/apps/web/dist ./web/dist
COPY --from=build /app/apps/web/server.ts ./web/server.ts

EXPOSE 3000
EXPOSE 3001
CMD ["sh", "-c", "bun run ./server.js & bun run ./web/server.ts"]
