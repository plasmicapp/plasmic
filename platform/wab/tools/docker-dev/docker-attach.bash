#!/usr/bin/env bash

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

source $SCRIPTDIR/instructions.bash
docker exec -it local/plasmic-dev bash
