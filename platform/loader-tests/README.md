# loader-tests

End-to-end Playwright tests for Plasmic SDK packages. Tests verify that Plasmic projects render correctly when integrated into real framework apps (Next.js, Gatsby, CRA).

> **Note:** The `cypress/` directory and Jest-based specs in `src/nextjs/*.spec.ts` are **obsolete** and no longer maintained or run by CI. All active tests use Playwright.

## How it works

There are two kinds of Playwright tests:

### Loader tests (`src/playwright-tests/nextjs/`, `src/playwright-tests/gatsby/`, etc.)

Each test uploads a JSON bundle from `data/` to the local Plasmic server, copies a framework template (e.g. `src/nextjs/template-pages/`) into a temp directory, installs deps with `pnpm install --frozen-lockfile`, builds the app, starts it on a random port, then runs Playwright assertions against it. Tests run against multiple loader/framework version combinations defined in `src/env.ts`.

### E2E codegen/loader tests (`src/playwright-tests/e2e/`)

These tests exercise `create-plasmic-app` end-to-end. Instead of copying a template, each test runs `npx create-plasmic-app` to scaffold a real project (Next.js, React, or TanStack Start), builds it, starts a server, and runs Playwright assertions. Tests cover both codegen and loader schemes. On CI, all changed packages are published to verdaccio first so the scaffolded projects pick up the latest local builds.

### Adding a new loader test

Export a Plasmic project bundle as JSON into `data/`. Then write a Playwright spec in `src/playwright-tests/` by copying boilerplate from a similar test.

### Adding a new e2e test

This should rarely be needed.
Add a new spec file in `src/playwright-tests/e2e/` using `defineE2eTests()` from `e2e-test-utils.ts`. Specify the platform, test cases (scheme, typescript, appDir), and assertion callback. See `e2e-nextjs-codegen.spec.ts` for an example.

Note: These tests were split by platform into multiple files to enable parallel execution.

## pnpm in templates

The framework templates use pnpm with `--frozen-lockfile`. If you update a template's `package.json`, you need to regenerate the lockfile:

1. Create a `pnpm-workspace.yaml` in the template directory if it doesn't already exist:
   ```bash
   echo 'packages:\n  - "."' > src/nextjs/template-pages/pnpm-workspace.yaml
   ```
   This ensures that the `pnpm install` in the next step alters the template's own lock file.
   The `pnpm-workspace.yaml` file is gitignored and won't be committed.
2. Run `pnpm install` in the template directory to regenerate `pnpm-lock.yaml`.

## Running tests

```bash
# All tests
yarn test

# Playwright only
yarn test-playwright

# Specific test file
yarn test-playwright src/playwright-tests/nextjs/antd5/tabs.spec.ts

# Specific folder
yarn test-playwright src/playwright-tests/nextjs/antd5/

# Refresh snapshots for a specific spec
PLAYWRIGHT_REPORTER_OPEN=never yarn test-playwright src/playwright-tests/nextjs/nextjs-wordpress.spec.ts --update-snapshots

# Refresh all Playwright snapshots
yarn update-snapshots

# Interactive UI mode
yarn playwright-ui

# To run E2e tests (requires verdaccio with local packages published)
yarn local-publish
yarn run local:playwright-ui
```

On failure, traces and videos are saved to `test-results/`. The HTML report opens automatically, or run `npx playwright show-report`. Each test logs its temp directory path (`tmpdir /tmp/...`) which you can inspect to debug build issues (comment out teardown to keep it around).

## Updating snapshots

Playwright image baselines live in `snapshots/`.

1. Run the target spec with `PLAYWRIGHT_REPORTER_OPEN=never` and `--update-snapshots`, for example `PLAYWRIGHT_REPORTER_OPEN=never yarn test-playwright src/playwright-tests/nextjs/nextjs-wordpress.spec.ts --update-snapshots`.
2. Review the changed PNGs under `snapshots/`.
3. Re-run the same spec without `--update-snapshots` to confirm the new baselines pass.

Use `yarn update-snapshots` only when you intend to refresh all Playwright baselines.
