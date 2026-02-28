#!/usr/bin/env bash

set -e

yarn install --frozen-lockfile

for dir in packages/*; do
    echo "Installing... $dir"
    pushd "$dir"
    yarn install --frozen-lockfile
    popd
    echo "Done..."
    echo ""
done

for dir in platform/*; do
    echo "Installing... $dir"
    pushd "$dir"
    yarn install --frozen-lockfile
    if [ -d "internal_pkgs" ]; then
        for subdir in internal_pkgs/*; do
            pushd "$subdir"
            yarn install --frozen-lockfile
            if [ "$(jq -r '.scripts.build' package.json)" != "null" ]; then
                NODE_ENV=production yarn build
            fi
            popd
        done
    fi
    popd
    echo "Done..."
    echo ""
done

NX_REJECT_UNKNOWN_LOCAL_CACHE=0 yarn nx run-many --target=build --verbose

for dir in platform/*; do
    if [ "$dir" == "platform/wab" ]; then
        continue
    fi
    echo "Building... $dir"
    pushd platform/"$dir"
    if [ -f package.json ]; then
        if [ "\$(jq -r '.scripts.build' package.json)" != "null" ]; then
            NODE_ENV=production yarn build
        fi
    fi
    popd
    echo "Done..."
    echo ""
done

pushd platform/wab
make
NODE_ENV=production yarn build-css
export PUBLIC_URL="${PUBLIC_URL:-http://localhost:3003}"
echo "Building... wab for $PUBLIC_URL"
NODE_ENV=production yarn build
echo "Done..."
popd
