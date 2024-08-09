#!/usr/bin/env bash

set -o errexit -o nounset

timestamp="$(date +%Y%m%d_%H%M%S)"

if psql -U postgres -c 'select 1' >/dev/null; then
  no_sudo=1
fi

if [[ ${no_sudo:-} = 1 ]]; then
  psql='psql -U postgres'
else
  psql='sudo -u postgres psql'
fi

{
  $psql <<EOF
  alter database wab rename to wab_$timestamp;
EOF
  $psql <<EOF
  create database wab owner wab;
  create extension pgcrypto;
EOF
}

{
  $psql wab <<EOF
  create extension pgcrypto;
EOF
}

yarn typeorm migration:run
yarn seed
