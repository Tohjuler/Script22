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

FROM oven/bun:1.3.10-alpine AS web-deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages ./packages

RUN bun install --frozen-lockfile --production --filter web \
	&& find node_modules -type f \( \
		-name "*.d.ts" -o \
		-name "*.map" -o \
		-name "*.md" -o \
		-name "*.markdown" -o \
		-name "LICENSE*" -o \
		-name "CHANGELOG*" \
	\) -delete

FROM oven/bun:1.3.10-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-api /app/apps/server/dist/server.js ./server.js
COPY packages/db/src/migrations ./drizzle

EXPOSE 3000
CMD ["bun", "run", "./server.js"]

FROM oven/bun:1.3.10-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=web-deps /app/node_modules ./node_modules
COPY --from=web-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build-web /app/apps/web/dist ./apps/web/dist
COPY --from=build-web /app/apps/web/server.ts ./apps/web/server.ts

WORKDIR /app/apps/web

ENV ASSET_DIR=./dist
ENV APP_PREFIX=VITE_

COPY apps/web/env.sh ./env.sh
RUN chmod +x ./env.sh

COPY apps/web/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001
CMD ["./start.sh"]
