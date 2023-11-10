begin;

drop schema if exists ticketing cascade;

create schema ticketing;

set search_path = ticketing, public;

CREATE TABLE users
(
    id uuid primary key default gen_random_uuid(),
    email text,
    first_name text,
    last_name text,
    avatar_url text
);

CREATE TABLE files
(
    id uuid primary key default gen_random_uuid(),
    name text,
    mime_type text
);

CREATE TABLE tickets
(
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    description TEXT,
    status      text not null default 'Open', -- Open, Closed, In Progress
    created_by  uuid not null references users (id),
    assigned_to uuid references users (id),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    tags        jsonb
);

CREATE TABLE comments
(
    id         uuid primary key default gen_random_uuid(),
    ticket_id  uuid not null references tickets (id),
    author     uuid not null references users (id),
    comment    text not null,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE ticket_attachments
(
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references tickets (id),
    file_id uuid not null references files (id)
);

CREATE TABLE comment_attachments
(
    id uuid primary key default gen_random_uuid(),
    comment_id uuid not null references tickets (id),
    file_id uuid not null references files (id)
);

INSERT INTO users (id, email, first_name, last_name, avatar_url)
VALUES (gen_random_uuid(), 'user1@gmail.com', 'Sarah', 'Gonzalez', NULL);
INSERT INTO users (id, email, first_name, last_name, avatar_url)
VALUES (gen_random_uuid(), 'user2@gmail.com', 'Robert', 'Smith', NULL);
INSERT INTO users (id, email, first_name, last_name, avatar_url)
VALUES (gen_random_uuid(), 'support1@example.com', 'Corey', 'Bridges', NULL);
INSERT INTO users (id, email, first_name, last_name, avatar_url)
VALUES (gen_random_uuid(), 'support2@example.com', 'Julia', 'Ritchey', NULL);

grant all on schema ticketing to public;
grant all on all tables in schema ticketing to public;
grant all on all sequences in schema ticketing to public;
grant all on all functions in schema ticketing to public;

commit;