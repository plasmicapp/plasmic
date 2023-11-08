#!/usr/bin/env bash

if [[ $debug ]]
then debug_args=--inspect-brk=9229
else debug_args=
fi

NQ_SQLJS=1 NODE_OPTIONS="--max-old-space-size=630 $debug_args" node -r esbuild-register -r dotenv/config "$@"
