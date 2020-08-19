#/bin/bash

set -o errexit -o nounset

yarn eslint 'src/**'
tsc
cp ./tsconfig-transform.json ./dist
