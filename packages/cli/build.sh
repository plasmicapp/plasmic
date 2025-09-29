#/bin/bash

set -o errexit -o nounset

esbuild src/index.ts src/lib.ts --outdir=./dist --bundle --platform=node --format=cjs --inject:./import-meta-url.js --define:import.meta.url=import_meta_url
tsc --emitDeclarationOnly
cp ./tsconfig-transform.json ./dist
typescript-json-schema tsconfig.json 'PlasmicConfig' --excludePrivate --required > ./dist/plasmic.schema.json
