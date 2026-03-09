<h1 align="center">Script22</h1>
<br/>

This project was created because I needed a way to automatically update servers and was tired of the trouble of running other apps that are way too complicated for this simple purpose. So I created this app; it allows for adding servers, organizing them in folders, and running simple scripts defined in a config on them. The scripts run on a cron schedule and are fully configurable through the UI.

## Quick start (Docker)

The easiest way to deploy the app is though Docker.

### Docker compose

Copy one of the docker compose examples:

* [docker-compose.yml](https://github.com/Tohjuler/Script22/blob/main/docker-compose.yml) - Full app.
* [docker-compose.apprise.yml](https://github.com/Tohjuler/Script22/blob/main/docker-compose.apprise.yml) - Full app with apprise (used for notifications).

Edit the compose fil and configure the env variables.

Start the services:

```bash
docker compose up -d
```

The UI will be accible at **<http://localhost:3001>**, and the API at **<http://localhost:3000>**

### Docker run

For the server you need to copy the [.env.example](https://github.com/Tohjuler/Script22/blob/main/apps/server/.env.example) and rename it it `.env`, and then edit it to set the vars.

Start the server:

```bash
docker run -d \
--name Script22-api \
-p 3000:3000 \
-v ./.env:/app/.env \
-v ./db:/app/db/ \
ghcr.io/tohjuler/script22-api:latest
```

Start the web UI

```bash
docker run -d \
--name Script22-web \
-p 3001:3001 \
-e VITE_SERVER_URL=http://localhost:3000
ghcr.io/tohjuler/script22-web:latest
```

The UI will be accible at **<http://localhost:3001>**, and the API at **<http://localhost:3000>**

## Dev Setup

The stack uses [Bun](https//bun.sh), so you need that installed.

### Install

```bash
git clone https://github.com/Tohjuler/Script22.git

cd script22

bun install
```

### Configuation

Create a `.env` in `apps/server` and `apps/web`.

### Running

```bash
bun run dev
```

* Frontend: <http://localhost:3001>
* API: <http://localhost:3000>

### Building

```bash
bun run build
```

Output will be in `apps/web/dist` for web and `apps/server/dist` for the server.

## Project Structure

```text
script22/
├── apps/
│   ├── web/     # Frontend (Tanstack Start)
│   └── server   # API (ElysiaJs)
└── packages/
    ├── api/     # API Routes (orpc)
    ├── auth/    # Auth utils (Better-Auth)
    ├── config/  # TSConfig
    ├── db/      # Database utils and schema (Drizzle ORM)
    ├── env/     # Env config (env-core)
    └── logic/   # Logic layer
```
