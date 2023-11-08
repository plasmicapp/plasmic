#!/usr/bin/env bash

set -o errexit -o nounset

dot=import-chains.dot
json=import-graph.json
png=import-chains.png
query="${1:-src/wab/deps.ts}"

if [[ -f $json ]] ; then
  echo "Using cached $json. Remove it to re-analyze the code."
else
  echo "$json not found, re-analyzing the code."
  yarn depcruise -c tools/depcruise-config.js -T json -f $json src/wab/client/canvas-entry.tsx
fi
yarn run-ts tools/import-chains.ts $json $dot $query
dot -T png $dot > $png
