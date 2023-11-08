#!/bin/sh

git ls-files platform/wab/src/wab/server/bundle-migrations/* | xargs ./node_modules/.bin/ts-node -P platform/wab/tsconfig.tools.json platform/wab/src/wab/server/db/check-bundle-migrations.ts check