begin;

drop schema if exists ticketing cascade;

create schema ticketing;

set search_path = ticketing;

create table categories
(
    id   uuid primary key default gen_random_uuid(),
    name text not null
);

CREATE TABLE Tickets
(
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    Description TEXT,
    status      text not null default 'Open',
--                          Status ENUM('Open', 'Closed', 'In Progress', 'Pending') NOT NULL,
    created_by  text,
    assigned_to text,
--     created_by  uuid not null references users (id),
--     assigned_to uuid references users (id),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

CREATE TABLE Comments
(
    id         uuid primary key default gen_random_uuid(),
    ticket_id  uuid not null references tickets (id),
    author     text,
--     author     uuid not null references users (id),
    comment    text not null,
    created_at timestamptz DEFAULT now()
);

-- Inserting data into categories table
INSERT INTO categories (id, name)
VALUES ('0ecdf897-6fc0-4d79-aadd-4a0fbf8c08a6', 'Category 1'),
       ('53b2eb02-3b0b-4c0d-bb30-8ac6eb6f90c1', 'Category 2');

-- Inserting data into Tickets table
INSERT INTO Tickets (id, title, Description, Status, created_by, assigned_to, created_at, updated_at)
VALUES ('a5bc1ff3-c5db-4d8f-9f84-1f693c7a17b0', 'Ticket 1', 'Description for Ticket 1', 'Open',
        'user1@example.com', 'admin@admin.example.com', '2023-05-17 10:00:00',
        '2023-05-17 10:00:00'),
       ('4f2440db-2f07-4c80-89b4-8ac10c1bc9be', 'Ticket 2', 'Description for Ticket 2', 'Closed',
        'user2@example.com', 'user2@example.com', '2023-05-17 11:00:00',
        '2023-05-17 11:30:00');

-- Inserting data into Comments table
INSERT INTO Comments (id, ticket_id, author, comment, created_at)
VALUES ('c05dbb8a-70cd-40e5-bda4-6d548be67f27', 'a5bc1ff3-c5db-4d8f-9f84-1f693c7a17b0',
        'admin@admin.example.com', 'Comment 1 for Ticket 1', '2023-05-17 10:15:00'),
       ('78b43945-03c5-48b5-9147-894a0e705888', 'a5bc1ff3-c5db-4d8f-9f84-1f693c7a17b0',
        'user1@example.com', 'Comment 2 for Ticket 1', '2023-05-17 10:30:00');

grant all on schema ticketing to public;
grant all on all tables in schema ticketing to public;
grant all on all sequences in schema ticketing to public;
grant all on all functions in schema ticketing to public;

commit;
