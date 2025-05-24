#!/bin/bash

set -o errexit -o nounset

PGPASSWORD="SEKRET"
cat > ~/.pgpass << EOF
localhost:5432:*:wab:$PGPASSWORD
localhost:5432:*:cypress:$PGPASSWORD
localhost:5432:*:superwab:$PGPASSWORD
localhost:5432:*:supertdbwab:$PGPASSWORD
EOF
chmod 600 ~/.pgpass

# createdb are missing on some platforms, like Macports postgresql4-server.
psql -U postgres -c "create user wab password '$PGPASSWORD';"                                   # no special permissions
psql -U postgres -c "create user cypress password '$PGPASSWORD';"                               # no special permissions
psql -U postgres -c "create user superwab password '$PGPASSWORD' createdb createrole in group wab;" # let create tables and users
psql -U postgres -c "create user supertdbwab password '$PGPASSWORD' createdb createrole in group wab;"       # let create tables and users
psql -U postgres -c 'create database wab owner wab;'
# Needed for generate_uuid_v4, used in some migrations.
psql -U postgres -c 'create extension if not exists "uuid-ossp";'
