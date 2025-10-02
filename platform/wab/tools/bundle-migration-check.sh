#!/bin/sh

git ls-files platform/wab/src/wab/server/bundle-migrations/* | xargs ./node_modules/.bin/tsx --tsconfig platform/wab/tsconfig.tools.json platform/wab/src/wab/server/db/check-bundle-migrations.ts check