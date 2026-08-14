#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/host-url.bash"

REACT_APP_DEFAULT_HOST_URL=${HOST_URL} \
        REACT_APP_PUBLIC_URL=${REACT_APP_DEV_PROXY:-${REACT_APP_PUBLIC_URL:-http://localhost:3003}} \
        CODEGEN_HOST=${REACT_APP_DEV_PROXY:-${CODEGEN_HOST:-http://localhost:3003}} \
        SITE_ASSETS_BUCKET=plasmic-site-assets \
        SITE_ASSETS_BASE_URL='https://site-assets.plasmic.app/' \
        DISABLE_BWRAP=1 \
        bash tools/run.bash src/wab/server/main.ts
