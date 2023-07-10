#/bin/bash

set -o errexit -o nounset

./node_modules/.bin/eslint 'src/**'
./node_modules/.bin/esbuild src/index.ts --outfile=./dist/index.js --bundle --platform=node --format=cjs
tsc --emitDeclarationOnly
cp ./tsconfig-transform.json ./dist
typescript-json-schema tsconfig.json 'PlasmicConfig' --excludePrivate --required > ./dist/plasmic.schema.json
