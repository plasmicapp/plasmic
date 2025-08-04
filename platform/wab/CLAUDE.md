# CLAUDE.md - platform/wab

## Overview

WAB (Web Application Builder) is the core Plasmic Studio application codebase. It contains the React client, main app server, codegen server, and various tools.

## Key Commands

```bash
# Setup repo (must be performed in root directory)
cd ../.. && yarn setup-all

# Start full dev environment (frontend, backend, host-server) at http://localhost:3003
yarn dev

# Run unit tests
yarn test

# Update snapshots in unit tests
yarn test:update-snapshots

# Run TypeScript type checking
yarn typecheck

# Run ESLint (.eslintrc.js if in root directory)
yarn eslint-all

# Build production frontend
yarn build
```
