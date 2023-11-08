begin;

drop schema if exists todomvc cascade;

create schema todomvc;

set search_path = todomvc;

create table tasks
(
    id   uuid primary key default gen_random_uuid(),
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