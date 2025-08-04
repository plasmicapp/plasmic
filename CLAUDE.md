# CLAUDE.md

## Key tools of root directory

This is root directory of the monorepo. Most development will be done in individual packages, but this directory is responsible for some centrally managed concerns:

- package.json - common devDependencies where we want to use the same version everywhere
- build.mjs - common build script for `packages/`
- .eslintrc.js - shared eslint lint configuration
- jest.config.js - shared jest unit test configuration
- knip.ts - checks for unused dependencies, run with `knip:deps`

## Key directories

Plasmic is an open-source visual web builder. This monorepo contains:

- **Platform** (`platform/`) - Apps that make up the Plasmic platform, such as the wab, img-optimizer, etc
- **SDK packages** (`packages/`) - npm packages for integrating with Plasmic
- **Plasmic packages** (`plasmicpkgs/`) - npm packages that provide code components on Plasmic
- **Examples** (`examples/`) - Miscellaneous reference implementations

## Tech Stack

- Infra: Docker, k8s, Terraform
- Package Managers: asdf, npm, yarn, pnpm
- Languages: Node.js, TypeScript
- Libraries: React, MobX, TypeORM, Jest, Playwright, Cypress (deprecating) Storybook

## Instructions for AI assistant

Do not worry about styling/formatting. All files will be formatted to the same style in git hooks.
