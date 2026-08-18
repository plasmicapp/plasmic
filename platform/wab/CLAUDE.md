# CLAUDE.md - platform/wab

## Overview

WAB (Web Application Builder) is the core Plasmic Studio application codebase. It contains the React client, main app server, codegen server, and various tools.

## Key Commands

```bash
# Setup repo (must be performed in root directory)
cd ../.. && pnpm setup-all

# Start full dev environment (frontend, backend, host-server) at http://localhost:3003
pnpm dev

# Run unit tests
pnpm test

# Update snapshots in unit tests
pnpm test:update-snapshots

# Run TypeScript type checking
pnpm typecheck

# Run ESLint (.eslintrc.js if in root directory)
pnpm eslint-all

# Build production frontend
pnpm build
```

## Conventions

- Check `src/wab/shared/common.ts` before writing a helper. It is the shared
  grab-bag — `ensure`, `assert`, `withoutNils`, `maybe`, `only`, `tuple`,
  `spawn`, and map/set helpers like `xGroupBy` — and `src/wab/commons/` and
  lodash cover most of the rest. Do not hand-roll an equivalent of one.
- Use `ensure(x, msg)` and `assert(cond, msg)` rather than non-null assertions
  (`!`) or unchecked casts, so a broken invariant fails where it breaks and says
  what it expected.
- Dispatch on model classes with `switchType(...)` from `common.ts` rather than
  chains of `instanceof`. End the chain with `.result()`, which typechecks only
  once every input type is handled, so adding a model class fails the typecheck
  instead of falling through at runtime. Use `assertNever` or `unreachable` for
  the same purpose in a native `switch` or `if`/`else` chain.
- Gate an incomplete or risky feature behind a devflag
  (`src/wab/shared/devflags.ts`). Ship a user-visible behavior change ungated
  only when it is meant to be on for everyone the moment it deploys.
