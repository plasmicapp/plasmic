#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

cd platform

# Honor NPM_CONFIG_REGISTRY (verdaccio in CI) explicitly since pnpm's env-var
# config handling is stricter than yarn's.
registry="${NPM_CONFIG_REGISTRY:-https://registry.npmjs.org}"
args=(up --latest --registry "$registry" "@plasmicapp/*" "@plasmicpkgs/*")

# wab, canvas-packages, loader-bundle-env and loader-html-hydrate share the
# pnpm workspace rooted here: one recursive update, one lockfile.
pnpm -r "${args[@]}"

# The remaining platform projects are their own pnpm roots, so each needs its
# own update. Jobs that only build the pnpm workspace (studio-tests-root: tsc,
# eslint, vitest in wab) skip them.
if [[ "${1:-}" == "--workspace-only" ]]; then
  exit 0
fi

for project in host-test react-web-bundle sub; do
  (cd "$project" && pnpm "${args[@]}")
done
