#!/bin/bash -eux
echo "export const hostVersion = \"$npm_package_version\";" > src/version.ts
