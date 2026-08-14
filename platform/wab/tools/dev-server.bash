#!/usr/bin/env bash

cmd=${1:-dev}
port=${PORT:-3003}

source "$(dirname "${BASH_SOURCE[0]}")/host-url.bash"

REACT_APP_DEFAULT_HOST_URL=${HOST_URL} \
  REACT_APP_PUBLIC_URL=${REACT_APP_DEV_PROXY:-http://localhost:$port} \
  PUBLIC_URL=${REACT_APP_DEV_PROXY:-http://localhost:$port} \
  PORT=$port \
  NODE_OPTIONS="--max-old-space-size=16384" \
  yarn rsbuild $cmd
