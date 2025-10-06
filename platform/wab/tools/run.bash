#!/usr/bin/env bash

debug_port=${debug_port:-9229}
if [[ $debug ]]
then debug_args=--inspect=$debug_port
elif [[ $debug_brk ]]
then debug_args=--inspect-brk=$debug_port
else debug_args=
fi

if [[ ! $MAX_HEAP_SIZE ]]
then MAX_HEAP_SIZE="10000"
fi

if [[ ! $no_features ]]
then NODE_OPTIONS="$NODE_OPTIONS --experimental-repl-await"
fi

#NQ_SQLJS=1 NODE_OPTIONS="--max-old-space-size=10000 $debug_args ${NODE_OPTIONS:-}" tsx --tsconfig tsconfig.tools.json "$@"
NQ_SQLJS=1 NODE_OPTIONS="--max-old-space-size=$MAX_HEAP_SIZE $debug_args ${NODE_OPTIONS:-}" node -r esbuild-register -r dotenv/config "$@"
