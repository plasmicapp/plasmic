#!/usr/bin/bash

sudo -u postgres psql wab -c "DROP DATABASE IF EXISTS wab_dump"
sudo -u postgres psql wab -c "CREATE DATABASE wab_dump WITH TEMPLATE wab OWNER wab"
del_sql='delete from project_revision where id not in (select id from project_revision as pr where pr.revision = (select max(revision) from project_revision as sub where sub."projectId"=pr."projectId") or pr.id in (select "revisionId" from pkg_version))'
echo $del_sql | sudo -u postgres psql wab_dump
sudo -u postgres pg_dump wab_dump > /tmp/db_dump.sql
