# Soundcheck

Soundcheck is a concert-preparation workspace. Phase 0 establishes the publishing path before event data or integrations are added.

## Run locally

Use Node.js 20+ and pnpm:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
pnpm lint
pnpm exec next build --webpack
```

The project is connected to GitHub and Vercel; pushing `master` triggers a production deployment.
