#!/usr/bin/env bash

cmd=${1:-dev}
port=${PORT:-3003}

# Use existing env vars if set, otherwise use defaults
if [[ $REACT_APP_DEV_HOST_PROXY ]]; then
  HOST_URL_DEFAULT=${REACT_APP_DEV_HOST_PROXY}/static/host.html
elif [[ $REACT_APP_DEV_PROXY ]]; then
  HOST_URL_DEFAULT=https://host.plasmicdev.com/static/host.html
elif [[ $DEFAULT_HOST_URL ]]; then
  HOST_URL_DEFAULT=${DEFAULT_HOST_URL}static/host.html
else
  HOST_URL_DEFAULT=http://localhost:${HOSTSERVER_PORT:-3005}/static/host.html
fi

# Respect existing PUBLIC_URL if set
PUBLIC_URL_VALUE=${PUBLIC_URL:-${REACT_APP_DEV_PROXY:-http://localhost:$port}}
REACT_APP_PUBLIC_URL_VALUE=${REACT_APP_PUBLIC_URL:-$PUBLIC_URL_VALUE}
REACT_APP_DEFAULT_HOST_URL_VALUE=${REACT_APP_DEFAULT_HOST_URL:-$HOST_URL_DEFAULT}

REACT_APP_DEFAULT_HOST_URL=${REACT_APP_DEFAULT_HOST_URL_VALUE} \
  REACT_APP_PUBLIC_URL=${REACT_APP_PUBLIC_URL_VALUE} \
  PUBLIC_URL=${PUBLIC_URL_VALUE} \
  PORT=$port \
  NODE_OPTIONS="--max-old-space-size=16384" \
  yarn rsbuild $cmd
