#!/usr/bin/env bash

pnpm http-server build -c-1 -a ${BIND_HOST:-0.0.0.0} -p ${HOSTSERVER_PORT:-3005}
