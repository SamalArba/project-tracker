# Server: Docker Usage

## Requirements
- Docker installed (Linux/Mac/Windows)

## Build

Build the Docker image:

```bash
docker build -t project-tracker-server .
```

## Run

Run the server, persisting the (sqlite) database outside the container:

```bash
docker run -it --rm -p 4000:4000 \
  -v $(pwd)/prisma:/app/prisma \
  project-tracker-server
```

- This binds `./prisma` (with dev.db) to `/app/prisma` inside the container for persistent sqlite DB between runs.
- The Express API will be available at http://localhost:4000

## Development

You can still run locally with Node/ts-node/ts-node-dev as before (no Docker needed for dev).

---

## PostgreSQL + Docker Compose

Your server and DB can also be launched together for production/dev. This uses Postgres (instead of SQLite)!

### 1. Update Prisma Schema:

Prisma datasource should look like this for Postgres:

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

This is already applied for you.

### 2. Build & Launch all (with Docker Compose)

```bash
cd server
docker-compose up --build
```
This starts:
- `db`: Postgres (with named, persistent volume)
- `server`: Your Node/Express app, connecting to db

### The DATABASE_URL env is passed to Prisma and your app automatically.

### 3. Initialize DB Schema

Your container runs `npx prisma migrate deploy` automatically on boot (mapped from `docker-compose.yml`).

If you make model changes, update migrations as usual:
- Locally: `npx prisma migrate dev` (creates new migration and applies to the db)
- Or, in container: `docker-compose exec server npx prisma migrate dev`

### 4. Connect Locally to Postgres for Dev

Set `.env` to:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tracker
```
And run server/dev workflows with Postgres instead of SQLite.

---

**Switch back to SQLite?**
Edit `prisma/schema.prisma` (change provider/url) and rebuild.
