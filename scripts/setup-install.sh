#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Install each dependency root once; wab and the loader/canvas packages share platform/.
for project in . platform platform/sub platform/react-web-bundle platform/live-frame; do
  (cd "$project" && pnpm install "$@")
done
