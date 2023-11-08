begin;

drop schema if exists feedback cascade;

create schema feedback;

set search_path = feedback;

CREATE TABLE feedback
(
    id         UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
    author     text, -- UUID references users (id),
    title      TEXT,
    feedback   TEXT,
    status     text default 'New', -- New, Reviewing, Resolved
    response   TEXT, -- Admin only
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments
(
    id          uuid primary key default gen_random_uuid(),
    feedback_id uuid not null references feedback (id),
    author   text, -- uuid not null references users (id),
    comment     text not null,
    created_at  timestamptz        DEFAULT now()
);

INSERT INTO feedback (id, author, title, feedback, status, response, created_at)
VALUES ('e48aa0a6-60be-4e06-bc45-9073a364eead', 'john.doe@example.com', 'Improving Communication',
        'There is a need for better communication channels within the team.', 'New', NULL, '2023-05-29 10:30:12'),
       ('f1dd85a8-4e3d-481d-a2f4-6c5120e7ab88', 'jane.smith@example.com', 'Work-Life Balance',
        'We should prioritize work-life balance to ensure employee well-being.', 'Reviewing', NULL,
        '2023-05-29 11:50:28'),
       ('9d2d5f23-6b85-4a3f-a870-27f8a1de9b3e', 'michael.rogers@example.com', 'Recognition and Rewards',
        'Recognizing and rewarding employees for their achievements would boost morale.', 'Resolved',
        'Thank you for your feedback!', '2023-05-29 15:02:19');

INSERT INTO comments (id, feedback_id, author, comment, created_at)
VALUES ('25eafda7-298d-4d2d-b5a9-8c0dc1b54376', 'e48aa0a6-60be-4e06-bc45-9073a364eead',
        'john.doe@example.com', 'I agree, communication has been a challenge lately.',
        '2023-05-29 10:35:42'),
       ('2fdd6a26-6036-4e7c-8836-7a0aa33ae190', 'e48aa0a6-60be-4e06-bc45-9073a364eead',
        'jane.smith@example.com',
        'We should explore different communication tools for better collaboration.', '2023-05-29 10:40:18'),
       ('597c4ae6-f3a9-4ad1-b649-52f9ce7e7c90', 'f1dd85a8-4e3d-481d-a2f4-6c5120e7ab88',
        'michael.rogers@example.com',
        'Finding the right work-life balance can significantly improve productivity.', '2023-05-29 11:55:07'),
       ('35fe6e4b-c22b-4e2d-8b9e-946fe4c71fe7', '9d2d5f23-6b85-4a3f-a870-27f8a1de9b3e',
        'john.doe@example.com', 'Recognizing achievements will motivate employees to perform better.',
        '2023-05-29 15:10:51');

grant all on schema feedback to public;
grant all on all tables in schema feedback to public;
grant all on all sequences in schema feedback to public;
grant all on all functions in schema feedback to public;

commit;