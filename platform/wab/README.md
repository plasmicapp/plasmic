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
test/                        # code that may only be used in tests
```
