begin;

drop view if exists tweet_details;
drop table if exists trusted_users;
drop table if exists follows;
drop table if exists likes;
drop table if exists tweets;
drop table if exists users;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text,
  username text,
  bio text,
  avatar_url text,
  background_url text,
  email text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table tweets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  body text,
  media_url text,
  thread_id uuid default gen_random_uuid(),
  reply_to uuid references tweets(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  repost_of uuid references tweets(id)
);

create table likes (
  user_id uuid references users(id) not null,
  tweet_id uuid references tweets(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (user_id, tweet_id)
);

create table follows (
  follower_id uuid references users(id) not null,
  followee_id uuid references users(id) not null,
  created_at timestamp with time zone default now(),
  primary key (follower_id, followee_id)
);

create table trusted_users (
  trusted_user_id uuid references users(id) not null,
  created_at timestamp with time zone default now(),
  primary key (trusted_user_id)
);

create unique index user_username on users (username);
create unique index user_email on users (email);

insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e10', 'Admin Account', 'admin', 'I am the admin account', 'https://ui-avatars.com/api/?name=Admin+Account', 'admin@admin.example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1a', 'Bruce Wayne', 'batman', 'I am Batman, looking for the joker', 'https://ui-avatars.com/api/?name=Bruce+Wayne', 'batman@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1b', 'Clark Kent', 'superman', 'I am Superman, keep me away from kryptonite', 'https://ui-avatars.com/api/?name=Clark+Kent', 'superman@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1c', 'Diana Prince', 'wonderwoman', 'I am Wonder Woman, defender of truth and justice', 'https://ui-avatars.com/api/?name=Diana+Prince', 'wonderwoman@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1d', 'Barry Allen', 'flash', 'I am The Flash, the fastest man alive', 'https://ui-avatars.com/api/?name=Barry+Allen', 'flash@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1e', 'Arthur Curry', 'aquaman', 'I am Aquaman, king of the seven seas', 'https://ui-avatars.com/api/?name=Arthur+Curry', 'aquaman@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1f', 'Peter Parker', 'spiderman', 'I am Spider-Man, friendly neighborhood superhero', 'https://ui-avatars.com/api/?name=Peter+Parker', 'spiderman@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e20', 'Tony Stark', 'ironman', 'I am Iron Man, genius billionaire playboy philanthropist', 'https://ui-avatars.com/api/?name=Tony+Stark', 'ironman@example.com');
insert into users (id, name, username, bio, avatar_url, email) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e21', 'Natasha Romanoff', 'blackwidow', 'I am Black Widow, former KGB agent and Avenger', 'https://ui-avatars.com/api/?name=Natasha+Romanoff', 'blackwidow@example.com');

insert into tweets (id, user_id, body, reply_to, thread_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e22', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1a', 'I am the night', null, 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea0');
insert into tweets (id, user_id, body, reply_to, thread_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e23', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1b', 'I am faster than a speeding bullet', null, 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea1');
insert into tweets (id, user_id, body, reply_to, thread_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e24', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1c', 'I am a warrior for justice', null, 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea2');
insert into tweets (id, user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e25', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1d', 'I am the fastest man alive', null);
insert into tweets (id, user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e26', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1e', 'I am the king of the seven seas', null);
insert into tweets (id, user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e27', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1f', 'I am your friendly neighborhood Spider-Man', null);
insert into tweets (id, user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e28', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e20', 'I am Iron Man', null);
insert into tweets (id, user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e29', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e21', 'I am a former KGB agent and Avenger', null);
insert into tweets (id, user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea0', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e10', 'Admin here', null);

insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1a', 'I am vengeance, I am the night, I am Batman', null);
insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1b', 'I stand for truth, justice, and the American way', null);
insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1c', 'I will fight for those who cannot fight for themselves', null);
insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1d', 'I am the lightning that strikes twice', null);
insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1e', 'I will protect the oceans and all who depend on them', null);
insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1f', 'With great power comes great responsibility', null);
insert into tweets (user_id, body, reply_to) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e20', 'Sometimes you gotta run before you can walk', null);

insert into tweets (user_id, body, reply_to, thread_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1a', 'I am the night', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e22', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea0');
insert into tweets (user_id, body, reply_to, thread_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1b', 'I am faster than a speeding bullet', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e23', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea1');
insert into tweets (user_id, body, reply_to, thread_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1c', 'I am a warrior for justice', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e24', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea2');

insert into tweets (user_id, repost_of) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e10', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea0');

insert into tweets (user_id, body, media_url) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e10', 'Beautiful city of Guadalajara', 'https://loktvbeqqsoyjqqwvmhq.supabase.co/storage/v1/object/public/plasmic_app_bucket/app_dev/20c9d297-e4d1-4f24-b069-8f670f78afac');

insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e22', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1a');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e23', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1b');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e24', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1c');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e25', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1d');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e26', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1e');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e27', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1f');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e28', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e20');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e29', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e21');
insert into likes (tweet_id, user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7ea0', 'd7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e10');

insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e10');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1a');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1b');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1c');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1d');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1e');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e1f');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e20');
insert into trusted_users (trusted_user_id) values ('d7e7e7c8-8a5e-4c7f-8c5a-1f9d7c9b7e21');

create or replace view tweet_details as
select
  t.id,
  t.body,
  t.media_url,
  t.created_at,
  t.reply_to,
  t.repost_of,
  u.id as user_id,
  u.name as user_name,
  u.avatar_url,
  u.username,
  (select count(*) from likes l where l.tweet_id = coalesce(t.repost_of, t.id))::integer as like_count,
  (select count(*) from tweets replies where replies.reply_to = coalesce(t.repost_of, t.id))::integer as reply_count,
  (select count(*) from tweets reposts where reposts.repost_of = coalesce(t.repost_of, t.id))::integer as retweet_count,
  rt.id as retweet_id,
  rt.body as original_body,
  rt.media_url as original_media_url,
  rt.created_at as original_created_at,
  ou.id as original_user_id,
  ou.name as original_user_name,
  ou.avatar_url as original_user_avatar_url,
  ou.username as original_user_username
from tweets t
join users u on t.user_id = u.id
left join tweets rt on t.repost_of = rt.id
left join users ou on rt.user_id = ou.id;


commit;
