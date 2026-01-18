#!/bin/bash
# This script ensures the database user and database exist before running migrations.
# It should be run from the wab container before typeorm migrations.

set -o errexit -o nounset

DB_HOST="${DB_HOST:-plasmic-db}"
DB_PASSWORD="${DB_PASSWORD:-SEKRET}"
DB_USER="${DB_USER:-wab}"
DB_NAME="${DB_NAME:-wab}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-SEKRET}"

echo "Checking database setup on $DB_HOST..."

# Wait for postgres to be ready
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -c '\q' 2>/dev/null; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "PostgreSQL is ready. Checking user and database..."

# Check if user exists, create if not
USER_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | tr -d ' ')
if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating user $DB_USER..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
    echo "User $DB_USER already exists."
fi

# Check if database exists, create if not
DB_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | tr -d ' ')
if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database $DB_NAME..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
else
    echo "Database $DB_NAME already exists."
fi

# Ensure uuid-ossp extension exists
echo "Ensuring uuid-ossp extension..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -d "$DB_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

echo "Database setup verified successfully!"
