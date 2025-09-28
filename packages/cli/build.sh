#/bin/bash

set -o errexit -o nounset

esbuild src/index.ts src/lib.ts --outdir=./dist --bundle --platform=node --format=cjs
tsc --emitDeclarationOnly
cp ./tsconfig-transform.json ./dist
typescript-json-schema tsconfig.json 'PlasmicConfig' --excludePrivate --required > ./dist/plasmic.schema.json
