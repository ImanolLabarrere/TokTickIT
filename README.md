# TokTickIT

TokTickIT is an IT service desk application (Account & Access, Hardware, Software, Network
requests), built incrementally across CPE 334 Lab 1–4. **Lab 1** delivers a small vertical
slice proving the full stack works end to end: **React + Vite + Bootstrap → Express (TypeScript)
→ Prisma → PostgreSQL**.

This README covers Issue 1 (project foundation): how to install, configure, and run every
part of the stack locally, plus how to run the test suites.

## Tech stack

| Layer      | Choice                                  |
|------------|------------------------------------------|
| Frontend   | React + TypeScript + Vite + Bootstrap 5   |
| Backend    | Node.js + Express + TypeScript            |
| Database   | PostgreSQL + Prisma ORM                   |
| Testing    | Vitest (frontend & backend) + Supertest (API) |

## Repository structure

```
toktickit/
├── client/            # React + Vite + Bootstrap frontend
│   ├── src/
│   └── tests/lab-01/
├── server/             # Express + TypeScript API
│   ├── prisma/         # schema.prisma + seed.ts
│   ├── src/
│   └── tests/lab-01/
├── docs/lab-01/         # ai_use.md, reviewer.md, tests.md
├── .gitignore
└── README.md
```

## Prerequisites

Install these once on your machine (in addition to your IDE):

- **Node.js LTS (v20 or v22)** and npm — runs the frontend, backend, and all `npx` commands.
- **PostgreSQL** (v14+) running locally — the app's database. Any of these work:
  - Install natively for your OS (postgres.org installer, `brew install postgresql`, `apt install postgresql`, etc.), or
  - Run it in Docker (`docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16`).
- **Git** and a **GitHub account** (already set up per the Git & GitHub cheat sheet).
- *(Optional, recommended)* **GitHub CLI (`gh`)** for `gh pr create` / `gh repo create` from the terminal.
- *(Optional)* A Postgres GUI client (pgAdmin, TablePlus, DBeaver) if you don't want to use `psql` on the command line — not required, `psql`/Prisma Studio are enough.

You do **not** need to install React, Express, Prisma, Vitest, etc. globally — they are project
dependencies installed via `npm install` in the next steps.

## 1. Clone and install

```bash
git clone https://github.com/<you>/toktickit.git
cd toktickit

cd client && npm install
cd ../server && npm install
```

## 2. Configure environment variables

Neither `.env` file is committed (see `.gitignore`) — copy the example files and adjust if needed:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

`server/.env` must point at a real local PostgreSQL database, e.g.:

```
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

Create the matching role/database once (skip if you used the Docker command above, which
already creates them):

```bash
psql -U postgres -c "CREATE USER toktickit WITH PASSWORD 'toktickit';"
psql -U postgres -c "CREATE DATABASE toktickit OWNER toktickit;"
```

## 3. Initialize Prisma

```bash
cd server
npx prisma generate
```

This reads `server/prisma/schema.prisma` and generates the Prisma Client used by the API.
(The `Category` model and its migration are added in Issue 3 — for Issue 1 this step only
needs to complete without error, confirming Prisma is initialized and can reach the database.)

## 4. Run the app locally

In two terminals:

```bash
# Terminal 1 — backend
cd server
npm run dev        # http://localhost:3000

# Terminal 2 — frontend
cd client
npm run dev         # http://localhost:5173
```

Open http://localhost:5173 — you should see the TokTickIT heading, styled with Bootstrap, and
a **Check System** button. (The button's behavior — calling the API and showing
online/offline status and categories — is implemented across Issues 2–4.)

## 5. Run the automated tests

```bash
cd client && npm test    # Vitest — React component tests
cd server && npm test    # Vitest + Supertest — API tests
```

At the end of Issue 1, the tooling itself must run cleanly. Some individual tests are
expected to fail or show as `.todo` until their feature is implemented in a later Issue
(e.g. `GET /api/health` returns 200 only once Issue 2 is merged) — that's expected, not a
setup problem.

## Git workflow

This project follows Git Flow with `main` (stable) ← `lab1-staging` (integration) ←
`feature/*` branches, one per Issue, each merged via a peer-reviewed Pull Request. See the
Lab 1 Git & GitHub cheat sheet for the full command reference.

## Documentation

- `docs/lab-01/ai_use.md` — AI coding assistant usage and reflection.
- `docs/lab-01/reviewer.md` — peer review record.
- `docs/lab-01/tests.md` — test plan and evidence.
