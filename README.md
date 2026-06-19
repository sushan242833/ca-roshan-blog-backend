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
