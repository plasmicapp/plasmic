#!/usr/bin/env bash

set -o errexit -o nounset -o

cd platform

# For now, this doesn't do achieve much other than labeling output, since yarn needs mutex so no parallelism.

npx --yes concurrently \
  --kill-others-on-fail \
  --max-processes 1 \
  --names canvas-packages,host-test,loader-bundle-env,loader-html-hydrate,react-web-bundle,sub,wab \
  'cd canvas-packages && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd canvas-packages && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  'cd host-test && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd host-test && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  'cd loader-bundle-env && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd loader-bundle-env && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  'cd loader-html-hydrate && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd loader-html-hydrate && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  'cd react-web-bundle && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd react-web-bundle && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  'cd sub && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd sub && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  'cd wab && yarn --mutex network upgrade --latest --scope @plasmicapp' \
  'cd wab && yarn --mutex network upgrade --latest --scope @plasmicpkgs' \
  # end
