#/bin/bash

set -o errexit -o nounset

eslint 'src/**'
tsc
cp ./tsconfig-transform.json ./dist
