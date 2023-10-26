#!/bin/bash -eux

yarn install --ignore-scripts

# Some packages require running `yarn install` on their directory to
# build successfully.
for package in packages/loader-angular packages/react-web-runtime; do
  pushd $package
  yarn install --ignore-scripts
  popd
done

nx run-many --target=build
