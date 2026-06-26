#!/bin/bash

set -euo pipefail

# Locally (re)publishes a package and its workspace dependencies to Verdaccio.
# With no argument, publishes all (non-private) packages.
# Usage: ./scripts/local-publish.sh [@plasmicapp/loader-nextjs]

pkg=${1:-}
registry=http://localhost:4873

cd "$(dirname "$0")/.."

if [ -z "$pkg" ]; then
  filter=(-r)
  echo "Locally publishing all packages"
else
  # "pkg..." selects the package and all of its workspace dependencies
  filter=(--filter "${pkg}...")
  echo "Locally publishing $pkg and its dependencies"
fi

# First, locally unpublish (ignore failures, e.g. for private/never-published pkgs)
pnpm "${filter[@]}" --no-bail exec sh -c \
  "npm unpublish -f --registry=$registry \"\$PNPM_PACKAGE_NAME\"" || true

# Build (pnpm runs the dependency graph topologically)
pnpm "${filter[@]}" run build

# Finally, publish, skipping the build step. Skip private packages.
export PREPARE_NO_BUILD=true
pnpm "${filter[@]}" exec sh -c \
  "node -e 'process.exit(require(\"./package.json\").private ? 0 : 1)' \
   || npm publish --ignore-scripts --registry=$registry"

unset PREPARE_NO_BUILD
