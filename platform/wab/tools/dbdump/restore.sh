#!/usr/bin/bash

h=$HOSTNAME
if [[ "$h" =~ ^ip-.* ]]; then
  echo "Are you doing something wrong?"
  exit
fi

stamp=`date +%s`
sudo -u postgres psql -c "CREATE DATABASE wab_bak$stamp WITH TEMPLATE wab OWNER wab"
sudo -u postgres psql -c "DROP DATABASE wab"
sudo -u postgres psql -c "CREATE DATABASE wab owner wab"
sudo -u postgres psql wab < /tmp/db_dump.sql

