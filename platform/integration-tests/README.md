# Plasmic Integration Tests

Smoke tests for the latest published `create-plasmic-app` and Plasmic packages
against the hosted Plasmic service. Each case scaffolds an app in a temporary
directory and runs its production build. No local development server is required.

The 15 cases cover Next.js (Pages and App Router, codegen and loader, JavaScript
and TypeScript), Gatsby (codegen and loader, JavaScript and TypeScript), React/Vite
(codegen, JavaScript and TypeScript), and TanStack (codegen, TypeScript).

## Running locally

Use Node.js 24 and Git, with access to npm, GitHub (for starter templates), and
Plasmic. From this directory:

```sh
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

`package.json` pins pnpm independently of the platform workspace. Vitest runs once
by default; use `pnpm test:watch` for watch mode. To run one case:

```sh
pnpm test -t 'nextjs loader typescript app router'
```

Tests run sequentially due to CPU and memory requirements. The tests exercise published
packages, so local SDK/CLI edits need to be published before the suite can validate them.

The read-only fixture project is
https://studio.plasmic.app/projects/YeV7hBtta1Q9hvodwJjB6. Its project API token is
supplied by the test; a personal Plasmic login is not required.

## Running with Docker

```sh
docker build -t integration-tests .
docker run --rm integration-tests
```
