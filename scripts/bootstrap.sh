#!/bin/bash -eux

export PREPARE_NO_BUILD=true

# Install all workspace dependencies (packages/ + plasmicpkgs/) with pnpm.
pnpm install

# Some packages require running an install in their own directory to build
# successfully. platform/host-test is its own pnpm root (not part of the root
# pnpm workspace).
for package in platform/host-test; do
  pushd $package
  pnpm install
  popd
done

# Build everything in topological order.
pnpm -r run build
