#/bin/bash

yarn eslint 'src/**'
tsc
cp ./tsconfig-transform.json ./dist
