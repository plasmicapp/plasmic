#!/usr/bin/env bash

set -e

function on_exit() {
  if [[ $exit_cmds ]] ; then
    exit_cmds="$@
$exit_cmds"
  else
    exit_cmds="$@"
  fi
  trap "$exit_cmds" EXIT SIGINT SIGTERM
}

mv ../../.eslintrc.js ../../.eslintrc_copy.js
on_exit "mv ../../.eslintrc_copy.js ../../.eslintrc.js"

NO_ESLINT=1 NO_TYPECHECK=1 NODE_OPTIONS="--max-old-space-size=12288 --max_old_space_size=12288" \
  yarn run react-scripts build