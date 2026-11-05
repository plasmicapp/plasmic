#!/bin/bash

set -o errexit -o nounset

wab_password="SEKRET"
cat > ~/.pgpass << EOF
localhost:5432:*:wab:$wab_password
localhost:5432:*:superwab:$wab_password
EOF
chmod 600 ~/.pgpass

# Superuser that runs the setup: $POSTGRES_USER if set (the postgres image's
# bootstrap superuser), otherwise the first passwordless superuser found.
is_superuser() {
  [[ "$(psql -X -U "$1" -d postgres -w -Atc 'select rolsuper from pg_roles where rolname = current_user' 2> /dev/null)" == t ]]
}
admin="${POSTGRES_USER:-}"
if [[ -z "$admin" ]]; then
  for candidate in wab "${USER:-}" postgres; do
    if [[ -n "$candidate" ]] && is_superuser "$candidate"; then
      admin="$candidate"
      break
    fi
  done
fi
if [[ -z "$admin" ]]; then
  echo "ERROR: No passwordless superuser found. Run with POSTGRES_USER=<superuser> (and PGPASSWORD if it needs one)." >&2
  exit 1
fi

admin_psql() { psql -X -v ON_ERROR_STOP=1 -U "$admin" "$@"; }
query() { admin_psql -d postgres -Atc "$1"; }

# \gexec runs conditional creation statements outside a transaction, as CREATE DATABASE requires.
admin_psql -d postgres -v wab_password="$wab_password" <<'SQL'
select format('create role %I login', name)
from (values ('wab'), ('superwab')) as roles(name)
where not exists (select from pg_roles where rolname = name)
\gexec

alter user wab password :'wab_password';
alter user superwab password :'wab_password' createdb createrole;
grant wab to superwab;

select 'create database wab owner wab'
where not exists (select from pg_database where datname = 'wab')
\gexec
alter database wab owner to wab;

-- Needed for generate_uuid_v4, used in some migrations.
\connect wab
create extension if not exists "uuid-ossp";

-- Test helpers must be able to force drop databases with active wab sessions.
alter user wab nosuperuser createdb nocreaterole;
SQL

# Checks below only warn.
warn() { echo "WARNING: $*" >&2; }

server_version_num="$(query 'show server_version_num')"
if ((server_version_num < 180000 || server_version_num >= 190000)); then
  warn "Postgres $(query 'show server_version') doesn't match prod (18)."
fi

for role in wab superwab; do
  if [[ "$(query "select exists (
      select from pg_roles accessible
      where (accessible.oid = app.oid
        or pg_has_role(app.oid, accessible.oid, 'set'))
        and (accessible.rolsuper
          or pg_has_role(accessible.oid, 'pg_execute_server_program', 'usage')
          or pg_has_role(accessible.oid, 'pg_read_server_files', 'usage')
          or pg_has_role(accessible.oid, 'pg_write_server_files', 'usage'))
    ) from pg_roles app where rolname = '$role'")" == t ]]; then
    warn "$role is a superuser or can run programs or access files on the server."
  fi
done

for role in $(query 'select rolname from pg_roles where rolsuper and rolcanlogin'); do
  if env -u PGPASSWORD -u PGPASSFILE psql -X -h 127.0.0.1 -U "$role" -d postgres -w -c 'select 1' > /dev/null 2>&1; then
    warn "Superuser $role can log in without a password. Require scram-sha-256 for it in pg_hba.conf."
  fi
done
