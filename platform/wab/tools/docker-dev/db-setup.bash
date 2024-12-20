#!/usr/bin/env bash

set -o errexit -o nounset

PGPASSWORD="SEKRET"
cat > ~/.pgpass << EOF
localhost:5432:*:wab:$PGPASSWORD
localhost:5432:*:cypress:$PGPASSWORD
localhost:5432:*:superwab:$PGPASSWORD
localhost:5432:*:supertdbwab:$PGPASSWORD
EOF
chmod 600 ~/.pgpass

if psql -U postgres -c 'select 1' >/dev/null; then
  no_sudo=1
fi

if [[ ${no_sudo:-} = 1 ]]; then
  psql='psql -U postgres'
  service=
else
  psql='sudo -u postgres psql'
  service='sudo service'
fi

echo $psql
echo $service

# This will only work on systems with `service`. Best-effort.
$service postgresql start || true

# createdb are missing on some platforms, like Macports postgresql4-server.

$psql -c "create user wab password '$PGPASSWORD';"                                            # no special permissions
$psql -c "create user cypress password '$PGPASSWORD';"                                    # no special permissions
$psql -c "create user superwab password '$PGPASSWORD' createdb createrole in group wab;" # let create tables and users
$psql -c "create user supertdbwab password '$PGPASSWORD' createdb createrole in group wab;"           # let create tables and users
$psql -c 'create database wab owner wab;'
# Needed for generate_uuid_v4, used in some migrations.
$psql -c 'create extension if not exists "uuid-ossp";'
