#!/usr/bin/env bash

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
REPODIR="$SCRIPTDIR/../../../"

# Notes about this docker script:
# 1. Not very useful to have the container delete on-close.
# 2. Does not persist DB data.

echo "===== BUILDING ====" && \
  docker build -t local/plasmic-dev $SCRIPTDIR && \
  echo " " && \
  source $SCRIPTDIR/instructions.bash && \
  echo " " && \
  echo "===== RUNNING =====" && \
  docker run -it \
    --name plasmic-dev \
    -p 3004:3004 \
    -p 9229:9229 \
    -v "$REPODIR":/code \
    -w /code \
    local/plasmic-dev \
    bash
