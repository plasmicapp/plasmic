#/bin/bash

set -o errexit -o nounset

yarn eslint 'src/**'
tsc
cp ./tsconfig-transform.json ./dist
typescript-json-schema tsconfig.json 'PlasmicConfig' --excludePrivate --required > ./dist/plasmic.schema.json
