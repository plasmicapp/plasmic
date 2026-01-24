#!/bin/bash

set -o errexit -o nounset

PGPASSWORD="${DB_PASSWORD:-SEKRET}"
cat > ~/.pgpass << EOF
localhost:5432:*:wab:$PGPASSWORD
localhost:5432:*:cypress:$PGPASSWORD
localhost:5432:*:superwab:$PGPASSWORD
localhost:5432:*:supertdbwab:$PGPASSWORD
EOF
chmod 600 ~/.pgpass

# Helper function to create user if not exists, or update password if exists
create_user_if_not_exists() {
    local username=$1
    local password=$2
    local options=${3:-""}

    if psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='$username'" | grep -q 1; then
        echo "User $username exists, updating password..."
        psql -U postgres -c "ALTER USER $username WITH PASSWORD '$password' $options;"
    else
        echo "Creating user $username..."
        psql -U postgres -c "CREATE USER $username WITH PASSWORD '$password' $options;"
    fi
}

# Helper function to create database if not exists
create_db_if_not_exists() {
    local dbname=$1
    local owner=$2

    psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$dbname'" | grep -q 1 || \
        psql -U postgres -c "CREATE DATABASE $dbname OWNER $owner;"
}

# Create users (idempotent - won't fail if they exist)
create_user_if_not_exists "wab" "$PGPASSWORD"
create_user_if_not_exists "cypress" "$PGPASSWORD"
create_user_if_not_exists "superwab" "$PGPASSWORD" "CREATEDB CREATEROLE IN GROUP wab"
create_user_if_not_exists "supertdbwab" "$PGPASSWORD" "CREATEDB CREATEROLE IN GROUP wab"

# Create database (idempotent)
create_db_if_not_exists "wab" "wab"

# Needed for generate_uuid_v4, used in some migrations.
psql -U postgres -d wab -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

echo "Database setup completed successfully!"
