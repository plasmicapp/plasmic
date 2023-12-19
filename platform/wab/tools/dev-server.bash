#!/usr/bin/env bash

# This doesn't work, need to upgrade react-scripts to a version that supports SSL_CRT_FILE etc.
# Instead, for now, use a third-party tool like tools/https.bash or stunnel.
if [[ $WAB_HTTPS ]]; then
  if [[ ! -f localhost.pem || ! -f localhost-key.pem ]]; then
    mkcert localhost
  fi
  export HTTPS=true
  export SSL_CRT_FILE=localhost.pem
  export SSL_KEY_FILE=localhost-key.pem
fi

cmd=${1:-start}
port=${PORT:-3003}

if [[ $REACT_APP_DEV_HOST_PROXY ]]; then
        HOST_URL=${REACT_APP_DEV_HOST_PROXY}/static/host.html
elif [[ $REACT_APP_DEV_PROXY ]]; then
        HOST_URL=https://host.plasmicdev.com/static/host.html
else
        HOST_URL=http://localhost:${HOSTSERVER_PORT:-3005}/static/host.html
fi

# SKIP_PREFLIGHT_CHECK is needed because our root directory has an eslint
# version incompatible with create-react-app.
REACT_APP_DEFAULT_HOST_URL=${HOST_URL} \
  REACT_APP_PUBLIC_URL=${REACT_APP_DEV_PROXY:-http://localhost:$port} \
  PUBLIC_URL=${REACT_APP_DEV_PROXY:-http://localhost:$port} \
  NO_ESLINT=1 \
  NO_TYPECHECK=1 \
  PORT=$port \
  NODE_OPTIONS="--max-old-space-size=10000" \
  SKIP_PREFLIGHT_CHECK=true \
  node --max_old_space_size=10000 node_modules/.bin/react-scripts $cmd
