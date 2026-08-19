#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

cd platform

# wab, canvas-packages, loader-bundle-env and loader-html-hydrate share the
# pnpm workspace rooted here: one recursive update, one lockfile, no need for
# yarn's mutex/flock dance. Honor NPM_CONFIG_REGISTRY (verdaccio in CI)
# explicitly since pnpm's env-var config handling is stricter than yarn's.
pnpm -r up --latest \
  --registry "${NPM_CONFIG_REGISTRY:-https://registry.npmjs.org}" \
  "@plasmicapp/*" "@plasmicpkgs/*"

# The remaining platform projects are standalone yarn projects. Jobs that only
# build the pnpm workspace (studio-tests-root: tsc, eslint, vitest in wab) skip them.
if [[ "${1:-}" == "--workspace-only" ]]; then
  exit 0
fi

# flock: For some reason, yarn --mutex contention can cause yarn install to just quietly abort!
npx --yes concurrently \
  --kill-others-on-fail \
  --max-processes 7 \
  --timings \
  --names host-test,react-web-bundle,sub \
  'cd host-test && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd react-web-bundle && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd sub && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  # end
