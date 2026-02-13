#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

cd platform

# For now, this doesn't do achieve much other than labeling output, since yarn needs mutex so no parallelism.

# flock: For some reason, yarn --mutex contention can cause yarn install to just quietly abort!
npx --yes concurrently \
  --kill-others-on-fail \
  --max-processes 7 \
  --timings \
  --names canvas-packages,host-test,loader-bundle-env,loader-html-hydrate,react-web-bundle,sub,wab \
  'cd canvas-packages && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd host-test && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd loader-bundle-env && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd loader-html-hydrate && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd react-web-bundle && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd sub && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  'cd wab && flock /tmp/yarn-mutex yarn --mutex network upgrade --latest --pattern "@plasmic(app|pkgs)/*"' \
  # end
