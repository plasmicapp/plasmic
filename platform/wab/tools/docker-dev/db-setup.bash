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
psql -U wab -d postgres -c "alter user wab password '$PGPASSWORD';"                         # bootstrap user
psql -U wab -d postgres -c "create user cypress password '$PGPASSWORD';"                     # no special permissions
psql -U wab -d postgres -c "create user superwab password '$PGPASSWORD' createdb createrole in group wab;"    # let create tables and users
psql -U wab -d postgres -c "create user supertdbwab password '$PGPASSWORD' createdb createrole in group wab;"  # let create tables and users
psql -U wab -d postgres -c 'alter database wab owner to wab;'

# Needed for generate_uuid_v4, used in some migrations.
psql -U wab -d wab -c 'create extension if not exists "uuid-ossp";'

# The postgres image creates POSTGRES_USER as a superuser. Keep `wab` as the
# app/database owner, but drop superuser privileges so test helpers can force
# drop databases with active `wab` sessions.
psql -U wab -d postgres -c 'alter user wab nosuperuser createdb nocreaterole;'
