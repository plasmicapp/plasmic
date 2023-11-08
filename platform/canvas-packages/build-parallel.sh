#!/usr/bin/env bash

set -ex

builds_count=$(( "$(cat hostlessList.json | wc -l)" - 1 ))

build_cmd="build"
if [[ $ROLLUP_WATCH = 1 ]] ; then
    build_cmd="watch"
fi

for ((i=0;i<builds_count;i++)); do
    yarn $build_cmd --environment BUILD_INDEX:$i &
done

wait