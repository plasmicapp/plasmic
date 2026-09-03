# wab

## Overview

"wab" stands for "web application builder".
This directory contains the code for all Plasmic Studio app functionality.
This includes:

- React client
- Main app server
- Codegen server
- Lots of misc tools and scripts

## Directory structure

Overall rough directory structure (please feel free to fill in more):

```
.
├── package.json             # shared package.json for client and servers
│   ├── playwright/          # playwright e2e tests for wab client+server
│   ├── src/wab/
│   │   ├── client/          # client-only code (can only be imported by other client code)
│   │   ├── commons/         # generic code not specific to Plasmic
│   │   ├── server/          # server-only code (can only be imported by other server code)
│   │   ├── shared/          # code specific to Plasmic
│   │   └── ...              # TODO: move other files to one of the above directories
│   └── ...
└── ...
```

You might see the following directories in different areas of the code.
These have special meanings:

```
internal/                    # Plasmic-internal-only code that is not synced publicly
enterprise/                  # Plasmic-internal-and-enterprise code that is not synced publicly
__testonly__/                # code only used by tests (see "Testing" below)
__snapshots__/               # snapshots written by the test runner (see "Testing" below)
```

## Testing

### Test directory structure

Colocate tests next to the code they test:

```
src/wab/shared/core/
├── module.ts
├── module.test.ts           # unit test, needs nothing outside the process
├── module.spec.ts           # integration or e2e test, needs a running service such as Postgres
├── __snapshots__/           # snapshots written by the test runner, one per test file
│   └── module.test.ts.snap
└── __testonly__/            # code only used by tests, validated by ESLint rule
    ├── mocks.ts
    └── fixtures.ts
```

### Exposing internals with `_testonly`

When a test needs a function or value that a module should not otherwise
export, gather those internals in a single `_testonly` export at the bottom of
the module instead of exporting them individually:

```ts
export function publicFunction() {
  return internalFunction();
}

function internalFunction() { ... }

export const _testonly = { internalFunction };
```

The test imports `_testonly` and reaches the internals through it. Only test
files may reference `_testonly`; production code must use the module's real
exports.
