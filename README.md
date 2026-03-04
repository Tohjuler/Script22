<h1 align="center">Script22</h1>
<p align="center">A simple web app to automatically run scripts on servers through SSH.</p>
<br/>

## Table of Contents

* [⚡General Info](#general-information)
* [🧬Tech Stack](#tech-stack)
* [🔨Setup](#setup)
* [📝Contribution](#contribution)

## ⚡General Information

This project was created because I needed a way to automatically update servers and was tired of the trouble of running other apps that are way too complicated for this simple purpose. So I created this app; it allows for adding servers, organizing them in folders, and running simple scripts defined in a config on them. The scripts run on a cron schedule and are fully configurable through the UI.

## 🧬Tech Stack

* [Bun](https://bun.sh) - Js Runtime
* [Tanstack Start](https://tanstack.com/start/latest) - Web Framework
* [ElysiaJs](https://elysiajs.com/) - API Framework
* [oRPC](https://orpc.dev/) - API contract layer
* [Drizzle ORM](https://orm.drizzle.team) - Database ORM, with SQLite as database

## 🔨Setup

### 💻Local Development

1. Clone the repo
2. Install dependencies `bun i install`
3. Create a .env in `apps/server` and `apps/web`, and fill it in.
4. Start the server `bun run dev`

### 🖥️Docker

Get the [.env.example](https://github.com/Tohjuler/Script22/blob/main/apps/server/.env.example) file from the repo, edit it and then rename it to .env

This example expects you use the default database setup from .env.example.

Run the API image:

```bash
docker run -d \
--name Script22-api \
-p 3000:3000 \
-v ./.env:/app/.env \
-v ./db:/app/db/ \
ghcr.io/tohjuler/script22-api:latest
```

Run the web image:

```bash
docker run -d \
--name Script22-web \
-p 3001:3001 \
-e VITE_SERVER_URL=http://localhost:3000
ghcr.io/tohjuler/script22-web:latest
```

For at full stack deploy (app and consumet api)
See [docker-compose.yml](https://github.com/Tohjuler/Script22/blob/main/docker-compose.yml)

Access the UI at `http://localhost:3001`

## 📝Contribution

Contributions are always welcome!
Contributions can be given in the form of:

* Code (PR)
* Documentation (PR)
* Ideas (Issues)
* Bug reports (Issues)
