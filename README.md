# Roshan Blog - Backend

Backend scaffold for the Editorial Blog CMS. This repository contains the TypeScript + Express + Sequelize foundation. It intentionally does not implement business logic or CRUD APIs yet.

Quick start:

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` from `.env.example` and update values.

3. Run in development:

```bash
npm run dev
```

This scaffold uses path aliases defined in `tsconfig.json`. The dev script uses `ts-node-dev` with `tsconfig-paths` to resolve the aliases at runtime.

## Deployment

Build and start on the host with:

```bash
npm run deploy:build   # npm ci && npm run build && npm prune --omit=dev
npm start
```

`npm ci --omit=dev` on its own is **not** a valid deploy step for this project: `tsc`
lives in `devDependencies`, so a production-only install has nothing to compile
`dist/` with. The `deploy:build` script installs the full tree, compiles, and then
prunes — leaving `node_modules` free of TypeScript, supertest, sequelize-cli and
ts-node-dev while `dist/` is already built.

If your platform builds and runs in separate images (multi-stage Docker), compile in
the build stage and run `npm ci --omit=dev` in the runtime stage, copying `dist/` across.

Note that `tsconfig-paths` is a **runtime** dependency, not a dev one: `npm start`
loads `dist/register-paths.js`, which requires it to resolve the `@config/*`-style
path aliases. Moving it back into `devDependencies` will make a pruned production
install crash on boot.

## Feature flags

Flags follow the `FEATURE_FLAG_*` convention: the string `"1"` (or `"true"`) turns a feature **on**; `"0"` or an unset variable turns it **off**. The default when unset is always **off**, so forgetting the variable hides the feature rather than exposing it.

| Flag | Default | Values | Effect |
| --- | --- | --- | --- |
| `FEATURE_FLAG_CONTACT_PAGE` | `0` (off) | `1`/`true` = on, `0`/unset = off | Mounts the `POST /api/v1/contact` endpoint. When off, the route is unmounted and returns 404 — no live endpoint emails the owner. |

This flag has two halves:

- **Backend (this repo) — runtime.** Read in `src/config/env.ts` and used to gate the route mount in `src/app.ts`. Flipping it requires only a **restart**.
- **Frontend — build-time.** Inlined via `next.config.ts` and read through `src/config/features.ts`. Flipping it requires a **rebuild**.

Set the flag to the same value in both `.env` files so the nav link, page, sitemap entry, and API endpoint appear/disappear together.
