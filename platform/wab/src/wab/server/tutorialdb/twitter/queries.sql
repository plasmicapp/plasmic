-- Fetch home tweets

select * from get_tweet_details(currentUser ▸ customProperties ▸ id)
where (user_id != currentUser ▸ customProperties ▸ id or created_at > now() - interval '10 minutes') and reply_to is null
order by created_at desc;


-- Fetch user tweets

select * from get_tweet_details(currentUser ▸ customProperties ▸ id)
where username = user
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

select * from get_tweet_details(
currentUser ▸ customProperties ▸ id)
where reply_to =
tweet
order by created_at desc;

