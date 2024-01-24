#!/usr/bin/env bash

cmd=${1:-dev}
port=${PORT:-3003}

if [[ $REACT_APP_DEV_HOST_PROXY ]]; then
  HOST_URL=${REACT_APP_DEV_HOST_PROXY}/static/host.html
elif [[ $REACT_APP_DEV_PROXY ]]; then
  HOST_URL=https://host.plasmicdev.com/static/host.html
else
  HOST_URL=http://localhost:${HOSTSERVER_PORT:-3005}/static/host.html
fi

REACT_APP_DEFAULT_HOST_URL=${HOST_URL} \
  REACT_APP_PUBLIC_URL=${REACT_APP_DEV_PROXY:-http://localhost:$port} \
  PUBLIC_URL=${REACT_APP_DEV_PROXY:-http://localhost:$port} \
  PORT=$port \
  NODE_OPTIONS="--max-old-space-size=16384" \
  yarn rsbuild $cmd
