# Computes HOST_URL, the URL Studio loads the host iframe from
# (REACT_APP_DEFAULT_HOST_URL). Meant to be sourced, not executed.

if [[ $REACT_APP_DEV_HOST_PROXY ]]; then
  HOST_URL=${REACT_APP_DEV_HOST_PROXY}/static/host.html
elif [[ $REACT_APP_DEV_PROXY ]]; then
  HOST_URL=https://host.plasmicdev.com/static/host.html
else
  HOST_URL=http://localhost:${HOSTSERVER_PORT:-3005}/static/host.html
fi
