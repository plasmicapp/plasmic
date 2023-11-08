begin;

drop schema if exists forum cascade;

create schema forum;

set search_path = forum;

create table categories
(
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    created_at timestamptz        default now()
);

CREATE TABLE threads
(
    id          uuid primary key default gen_random_uuid(),
    category_id uuid not null references categories (id),
    title       text not null,
    created_by  text, -- uuid not null references users (id),
    created_at  timestamptz        default now(),
    updated_at  timestamptz        default now()
);

CREATE TABLE posts
(
    id         uuid primary key default gen_random_uuid(),
    thread_id  uuid not null references threads (id),
    body       text not null,
    created_by text, -- uuid not null references users (id),
    created_at timestamptz        DEFAULT now(),
    updated_at timestamptz        default now()
);

CREATE TABLE likes
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES posts (id),
    created_by text, -- uuid not null references users (id),
    created_at TIMESTAMPTZ        DEFAULT NOW(),
    updated_at TIMESTAMPTZ        DEFAULT NOW(),
    CONSTRAINT unique_post_user_likes UNIQUE (post_id, created_by)
);

INSERT INTO categories (id, name, created_at)
VALUES ('1e2a4f2d-7a15-4b2a-925c-c05b3d4a6639', 'Showcase', '2023-05-29 09:30:00'),
       ('c60a1be6-c276-4211-bb7e-fabda36f0ce4', 'Off-topic', '2023-05-29 09:35:00'),
       ('671fe64b-9c2f-4f3f-987b-977d2682874c', 'Help', '2023-05-29 09:40:00'),
       ('50a795c6-bb6f-41b2-b616-fdd1ff78770f', 'Announcements', '2023-05-29 09:45:00');

INSERT INTO threads (id, category_id, title, created_by, created_at, updated_at)
VALUES ('a9577d8b-d1df-4eaf-8275-5f6a122dd9c9', '1e2a4f2d-7a15-4b2a-925c-c05b3d4a6639', 'New artwork showcase',
        'lydia@example.com', '2023-05-29 10:00:00', '2023-05-29 10:00:00'),
       ('e066399b-59c4-453b-aaf2-cff5e5d24079', 'c60a1be6-c276-4211-bb7e-fabda36f0ce4', 'Favorite TV shows of all time',
        'evelyn@example.com', '2023-05-29 10:05:00', '2023-05-29 10:05:00'),
       ('cf2cb346-2ebd-40ae-9792-2da8e9c6f6cc', '671fe64b-9c2f-4f3f-987b-977d2682874c', 'Need help with CSS layout',
        'john@example.com', '2023-05-29 10:10:00', '2023-05-29 10:10:00'),
       ('56c42c18-5edc-4e8b-a762-3f1f4b26cb9d', '50a795c6-bb6f-41b2-b616-fdd1ff78770f',
        'Important Announcement: Forum Rules Update', 'sarah@example.com', '2023-05-29 10:15:00',
        '2023-05-29 10:15:00'),
       ('e2880e78-14e6-4d62-81a2-4291d72ae4a6', '1e2a4f2d-7a15-4b2a-925c-c05b3d4a6639', 'Amazing Photography Showcase',
        'lydia@example.com', '2023-05-29 10:20:00', '2023-05-29 10:20:00'),
       ('d3b93cde-1331-43cc-a2c4-eb1c935716ac', 'c60a1be6-c276-4211-bb7e-fabda36f0ce4',
        'Favorite Video Games of All Time', 'evelyn@example.com', '2023-05-29 10:25:00',
        '2023-05-29 10:25:00'),
       ('a9f1486a-1c70-46be-8bde-72b5e56a7196', '671fe64b-9c2f-4f3f-987b-977d2682874c', 'Need help with Python code',
        'john@example.com', '2023-05-29 10:30:00', '2023-05-29 10:30:00'),
       ('2b6d62fb-53d3-4f8c-8e19-9d03356c144e', '50a795c6-bb6f-41b2-b616-fdd1ff78770f', 'Site Maintenance Announcement',
        'sarah@example.com', '2023-05-29 10:35:00', '2023-05-29 10:35:00'),
       ('c161063f-784e-4b23-9bce-763accd724d5', '1e2a4f2d-7a15-4b2a-925c-c05b3d4a6639', 'Amazing Sculpture Showcase',
        'lydia@example.com', '2023-05-29 10:40:00', '2023-05-29 10:40:00'),
       ('9304191c-7fcd-40e9-bc0a-2cd661dd9f59', 'c60a1be6-c276-4211-bb7e-fabda36f0ce4', 'Favorite Books of All Time',
        'evelyn@example.com', '2023-05-29 10:45:00', '2023-05-29 10:45:00');

INSERT INTO posts (id, thread_id, body, created_by, created_at, updated_at)
VALUES ('81366362-4cbf-4490-bb9f-9ebf5fc7a2c0', 'a9577d8b-d1df-4eaf-8275-5f6a122dd9c9',
        'I''m excited to share my latest artwork with all of you! This piece represents my journey as an artist and the love I have for nature. I hope you all enjoy it!',
        'lydia@example.com', '2023-05-29 11:00:00', '2023-05-29 11:00:00'),
       ('eef7ce6a-1b61-4b17-9de3-3e5b3c44110f', 'a9577d8b-d1df-4eaf-8275-5f6a122dd9c9',
        'Wow, Lydia! This artwork is absolutely breathtaking. The way you''ve captured the colors and the details is truly remarkable. I''m in awe of your talent!',
        'evelyn@example.com', '2023-05-29 11:05:00', '2023-05-29 11:05:00'),
       ('e794b256-7847-45c9-b0f2-bdefbe79d411', 'a9577d8b-d1df-4eaf-8275-5f6a122dd9c9',
        'Lydia, this artwork speaks to my soul. The beauty and tranquility it emanates are simply captivating. You have a gift, and I''m grateful that you''ve shared it with us.',
        'john@example.com', '2023-05-29 11:10:00', '2023-05-29 11:10:00'),
       ('f7f5233e-2da0-4aee-a48f-8cfa051a5dfb', 'e066399b-59c4-453b-aaf2-cff5e5d24079',
        'I''d like to start by saying that "Breaking Bad" is hands down the best TV show ever created. The character development, the gripping storyline, and the exceptional acting make it a masterpiece.',
        'evelyn@example.com', '2023-05-29 11:15:00', '2023-05-29 11:15:00'),
       ('709b64fe-ff5b-4764-8a63-7ad92d687ef7', 'e066399b-59c4-453b-aaf2-cff5e5d24079',
        'Totally agree with you, Evelyn! "Breaking Bad" is a game-changer in the TV industry. The attention to detail and the moral complexity of the characters make it a must-watch for everyone.',
        'john@example.com', '2023-05-29 11:20:00', '2023-05-29 11:20:00'),
       ('6df55939-45e4-4504-9a23-d29831972a19', 'cf2cb346-2ebd-40ae-9792-2da8e9c6f6cc',
        'Hey everyone, I''m struggling with a CSS layout issue. I''ve been trying to align two divs side by side, but they keep stacking vertically. Any suggestions?',
        'john@example.com', '2023-05-29 11:25:00', '2023-05-29 11:25:00'),
       ('d1d0a7ef-295e-45a6-82c1-3af633d8a939', 'cf2cb346-2ebd-40ae-9792-2da8e9c6f6cc',
        'John, have you tried using flexbox or CSS grid for your layout? They provide powerful tools for managing the positioning of elements. It might help you achieve the desired result.',
        'sarah@example.com', '2023-05-29 11:30:00', '2023-05-29 11:30:00'),
       ('e151d5da-cced-418b-a72f-9e2484be8a75', '56c42c18-5edc-4e8b-a762-3f1f4b26cb9d',
        'Attention forum members! We have updated the forum rules to ensure a respectful and inclusive environment for everyone. Please take a moment to review the new guidelines.',
        'sarah@example.com', '2023-05-29 11:35:00', '2023-05-29 11:35:00'),
       ('d42b2fb8-5169-48d7-b60c-76e702d5f450', 'e2880e78-14e6-4d62-81a2-4291d72ae4a6',
        'I''ve recently taken up photography as a hobby, and I wanted to share some of my favorite shots with you all. Nature and landscapes are my favorite subjects. Let me know what you think!',
        'lydia@example.com', '2023-05-29 11:40:00', '2023-05-29 11:40:00'),
       ('7b0f8a7b-3f46-4ed1-8de0-f070e9fbaa78', 'e2880e78-14e6-4d62-81a2-4291d72ae4a6',
        'Your photography skills are outstanding, Lydia! Each shot captures the essence of the subject beautifully. The vibrant colors and the composition create a mesmerizing visual experience.',
        'evelyn@example.com', '2023-05-29 11:45:00', '2023-05-29 11:45:00'),
       ('dafe2499-5f86-41c7-86ef-4e27a8be3fae', 'e2880e78-14e6-4d62-81a2-4291d72ae4a6',
        'Lydia, these photographs are simply breathtaking! The way you''ve captured the natural beauty and the play of light is truly remarkable. Thank you for sharing your talent with us.',
        'sarah@example.com', '2023-05-29 11:50:00', '2023-05-29 11:50:00'),
       ('a3146b43-065d-4615-8f81-4b258726f249', 'd3b93cde-1331-43cc-a2c4-eb1c935716ac',
        'What are your favorite video games of all time? I''m always looking for new recommendations and interesting discussions about gaming.',
        'john@example.com', '2023-05-29 11:55:00', '2023-05-29 11:55:00'),
       ('bfc84e8b-0cfd-4b88-8f3a-eb7677b64f3c', 'd3b93cde-1331-43cc-a2c4-eb1c935716ac',
        'One of my all-time favorite video games is "The Legend of Zelda: Ocarina of Time." It''s a classic that defined a generation of gamers with its immersive world, memorable characters, and epic quests.',
        'sarah@example.com', '2023-05-29 12:00:00', '2023-05-29 12:00:00'),
       ('129f3479-0e84-4b19-b0c7-3fd44d8f48f3', 'd3b93cde-1331-43cc-a2c4-eb1c935716ac',
        'I''m a big fan of "Mass Effect" series. The rich storytelling, diverse characters, and the ability to shape the game''s outcome based on your choices make it an incredible gaming experience.',
        'evelyn@example.com', '2023-05-29 12:05:00', '2023-05-29 12:05:00'),
       ('8541e288-4ce6-4d10-8be9-8d848d2c2b57', 'a9f1486a-1c70-46be-8bde-72b5e56a7196',
        'Hey everyone, I could use some help with a Python code. I''m trying to implement a sorting algorithm, but it''s not working as expected. Any suggestions or sample code?',
        'evelyn@example.com', '2023-05-29 12:10:00', '2023-05-29 12:10:00'),
       ('f20f5ee9-4c45-4e43-8bc6-4291ff499b55', 'a9f1486a-1c70-46be-8bde-72b5e56a7196',
        'Evelyn, have you considered using the built-in sorting functions in Python, such as sorted() or list.sort()? They provide efficient and reliable sorting capabilities. If you can share your code, we can assist you better.',
        'john@example.com', '2023-05-29 12:15:00', '2023-05-29 12:15:00'),
       ('f6e04b8b-350d-47b7-91b9-d155b1a4e4db', '2b6d62fb-53d3-4f8c-8e19-9d03356c144e',
        'Attention forum members! We will be performing scheduled maintenance on the forum server tomorrow from 10:00 PM to 2:00 AM. The forum may experience temporary downtime during this period. Thank you for your understanding.',
        'sarah@example.com', '2023-05-29 12:20:00', '2023-05-29 12:20:00'),
       ('e4200d9c-7280-4e3c-bb49-c3e7a6c5a144', '9304191c-7fcd-40e9-bc0a-2cd661dd9f59', 'One of my all-time favorite books is "To Kill a Mockingbird" by Harper Lee. It''s a powerful story that tackles themes of racial injustice and morality.', 'john@example.com', '2023-05-29 12:30:00', '2023-05-29 12:30:00'),
('e94a3144-8a8b-44b1-b2ce-bf2f8e4c3527', '9304191c-7fcd-40e9-bc0a-2cd661dd9f59', 'I absolutely love "The Great Gatsby" by F. Scott Fitzgerald. The decadence of the 1920s and the tragic story of Jay Gatsby never fail to captivate me.', 'sarah@example.com', '2023-05-29 12:35:00', '2023-05-29 12:35:00'),
('f8aaf3fe-33d3-45d1-ba18-73662551bb88', '9304191c-7fcd-40e9-bc0a-2cd661dd9f59', 'One of the books that had a profound impact on me is "1984" by George Orwell. Its dystopian vision of a totalitarian regime is both haunting and thought-provoking.', 'evelyn@example.com', '2023-05-29 12:40:00', '2023-05-29 12:40:00'),
('4833458e-b7c4-4b78-909b-b2d59ceeb2da', 'c161063f-784e-4b23-9bce-763accd724d5', 'I recently came across an amazing sculpture called "The Thinker" by Auguste Rodin. The level of detail and the way it captures the contemplative pose is truly remarkable.', 'sarah@example.com', '2023-05-29 12:45:00', '2023-05-29 12:45:00'),
('5fb8fcf3-2f42-4e4f-985b-76ff2c0f74b2', 'c161063f-784e-4b23-9bce-763accd724d5', 'Another breathtaking sculpture is "David" by Michelangelo. The skill and craftsmanship required to create such a lifelike and imposing figure are awe-inspiring.', 'john@example.com', '2023-05-29 12:50:00', '2023-05-29 12:50:00');

INSERT INTO likes (id, post_id, created_by, created_at, updated_at)
VALUES ('ec6a7e8c-9026-4ebf-a86d-cf4f65a1c5e0', '81366362-4cbf-4490-bb9f-9ebf5fc7a2c0', 'lydia@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('867c0106-5e7d-4b35-a903-2e202c1a3a11', '81366362-4cbf-4490-bb9f-9ebf5fc7a2c0', 'john@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('7c1e02b5-2e06-4871-a487-6f8e3725d588', 'eef7ce6a-1b61-4b17-9de3-3e5b3c44110f', 'sarah@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('f7833c2e-9d34-46e5-a4c3-1c8b8ff5ad43', 'f7f5233e-2da0-4aee-a48f-8cfa051a5dfb', 'evelyn@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('dd4ad31b-d1a7-4498-9d07-29b5e93aaf70', 'd42b2fb8-5169-48d7-b60c-76e702d5f450', 'john@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('c8dfb758-307a-4d0b-b49b-bcb50084d0ae', '7b0f8a7b-3f46-4ed1-8de0-f070e9fbaa78', 'sarah@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('0cb60d0d-4e3e-4b30-a0c9-3ae1be752d54', 'd42b2fb8-5169-48d7-b60c-76e702d5f450', 'sarah@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('b82d49f7-6247-4043-a4c0-76f77a7beeb8', '7b0f8a7b-3f46-4ed1-8de0-f070e9fbaa78', 'evelyn@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('f54afcc5-22a5-44af-aad9-fce12f3d5be2', '7b0f8a7b-3f46-4ed1-8de0-f070e9fbaa78', 'john@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('f25292d4-aa74-44f2-af89-d6e98abba01d', 'd42b2fb8-5169-48d7-b60c-76e702d5f450', 'evelyn@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00'),
       ('c3f84a0a-91e4-41e3-8d22-df02d5b99745', 'f6e04b8b-350d-47b7-91b9-d155b1a4e4db', 'evelyn@example.com',
        '2023-05-29 12:25:00', '2023-05-29 12:25:00');

create view forum.posts_with_likes as
SELECT p.*, p.created_by as email, COUNT(l.id) AS like_count
FROM forum.posts p
         LEFT JOIN forum.likes l ON p.id = l.post_id
GROUP BY p.id;

create view forum.threads_with_details as
SELECT distinct on (t.id) t.*, c.name as category, p.created_at AS most_recent, count(pp.*) as num_posts
FROM forum.threads t
         LEFT JOIN forum.posts p ON t.id = p.thread_id
         LEFT JOIN forum.posts pp ON t.id = pp.thread_id
         join forum.categories c on t.category_id = c.id
group by t.id, p.id, c.id
order by t.id, p.created_at desc;

grant all on schema forum to public;
grant all on all tables in schema forum to public;
grant all on all sequences in schema forum to public;
grant all on all functions in schema forum to public;

commit;