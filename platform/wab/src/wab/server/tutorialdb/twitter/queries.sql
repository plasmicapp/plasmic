-- Fetch home tweets

select
  *,
  exists(select 1 from likes l where l.tweet_id = coalesce(t.repost_of, t.id) and l.user_id =

currentUser ▸ customProperties ▸ id) as user_liked
from tweet_details t
where (user_id !=
coalesce(
currentUser ▸ customProperties ▸ id, '00000000-0000-0000-0000-000000000000')::uuid or created_at > now() - interval '10 minutes') and reply_to is null
order by created_at desc;


-- Fetch user tweets

select
  *,
  exists(select 1 from likes l where l.tweet_id = coalesce(t.repost_of, t.id) and l.user_id =
currentUser ▸ customProperties ▸ id) as user_liked
from tweet_details t
where username =
user
order by created_at desc;


-- fetch tweet chain

with recursive tweet_chain(id, body, created_at, reply_to) as (
  select id, body, created_at, reply_to from get_tweet_details(
currentUser.customProperties.id) where id =
tweet
  union all
  select td.id, td.body, td.created_at, td.reply_to from get_tweet_details(
currentUser.customProperties.id) td
  join tweet_chain tc on tc.reply_to = td.id
)
select
  td.id,
  td.body,
  td.created_at,
  td.reply_to,
  td.repost_of,
  td.user_id,
  td.user_name,
  td.avatar_url,
  td.username,
  td.like_count,
  td.user_liked,
  td.reply_count,
  td.retweet_count,
  td.retweet_id,
  td.original_user_id,
  td.original_user_name,
  td.original_user_avatar_url,
  td.original_user_username
from tweet_chain tc
join get_tweet_details(
currentUser.customProperties.id) td on tc.id = td.id
order by created_at asc;



-- Fetch tweet replies

select
  *,
  exists(select 1 from likes l where l.tweet_id = coalesce(t.repost_of, t.id) and l.user_id =
currentUser ▸ customProperties ▸ id) as user_liked
from tweet_details t
where reply_to =
tweet
order by created_at desc;


-- Fetch trusted tweets

select
  *,
  exists(select 1 from likes l where l.tweet_id = coalesce(t.repost_of, t.id) and l.user_id =

currentUser ▸ customProperties ▸ id) as user_liked
from tweet_details t
where reply_to is null and repost_of is null and exists (
  select trusted_user_id from trusted_users where trusted_user_id = user_id
)
order by created_at desc;


-- Fetch user profile

select
  u.id,
  u.name as user_name,
  u.bio,
  u.created_at,
  u.avatar_url,
  u.background_url,
  u.username,
  (select count(*) from follows where followee_id = u.id)::integer as follower_count,
  (select count(*) from follows where follower_id = u.id)::integer as following_count,
  exists(select 1 from follows where followee_id = u.id and follower_id =
currentUser ▸ customProperties ▸ id) as is_following,
  exists(select 1 from follows where follower_id = u.id and followee_id =
currentUser ▸ customProperties ▸ id) as follows_you
from users u where username =

user;