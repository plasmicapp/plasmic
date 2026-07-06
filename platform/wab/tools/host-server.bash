#!/usr/bin/env bash

yarn http-server build -c-1 -p ${HOSTSERVER_PORT:-3005}
