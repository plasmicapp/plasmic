begin;

drop schema if exists todomvc cascade;

create schema todomvc;

set search_path = todomvc;

create table tasks
(
    id   uuid primary key default uuid_in(overlay(overlay(md5(random()::text || ':' || clock_timestamp()::text) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring),
    created_at timestamptz default now(),
    owner text not null,
    description text not null default '',
    done boolean not null default false
);

-- Inserting data into Users table

grant all on schema todomvc to public;
grant all on all tables in schema todomvc to public;
grant all on all sequences in schema todomvc to public;
grant all on all functions in schema todomvc to public;

commit;