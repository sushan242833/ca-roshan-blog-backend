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

## Feature flags

Flags follow the `FEATURE_FLAG_*` convention: the string `"1"` (or `"true"`) turns a feature **on**; `"0"` or an unset variable turns it **off**. The default when unset is always **off**, so forgetting the variable hides the feature rather than exposing it.

| Flag | Default | Values | Effect |
| --- | --- | --- | --- |
| `FEATURE_FLAG_CONTACT_PAGE` | `0` (off) | `1`/`true` = on, `0`/unset = off | Mounts the `POST /api/v1/contact` endpoint. When off, the route is unmounted and returns 404 — no live endpoint emails the owner. |

This flag has two halves:

- **Backend (this repo) — runtime.** Read in `src/config/env.ts` and used to gate the route mount in `src/app.ts`. Flipping it requires only a **restart**.
- **Frontend — build-time.** Inlined via `next.config.ts` and read through `src/config/features.ts`. Flipping it requires a **rebuild**.

Set the flag to the same value in both `.env` files so the nav link, page, sitemap entry, and API endpoint appear/disappear together.
