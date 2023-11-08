begin;

drop schema if exists timelog cascade;

create schema timelog;

set search_path = timelog;

CREATE TABLE categories
(
	id         UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
	name       TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entries
(
	id            UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
	owner_email text,
	-- owner_id uuid references users (id),
	category_id UUID REFERENCES categories (id),
	notes   TEXT,
	start_at    TIMESTAMPTZ ,
	end_at TIMESTAMPTZ,
	created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TABLE users
-- (
--     id         UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
--     email      TEXT NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );

INSERT INTO categories (name)
VALUES
	('product'),
	('sales'),
	('social'),
	('user conversations'),
	('support'),
	('hiring'),
	('management'),
	('market research'),
	('competition'),
	('administrivia'),
	('retreat'),
	('CR'),
	('influencers'),
	('content'),
	('announcements'),
	('CS'),
	('growth'),
	('fun'),
	('strategy'),
	('networking'),
	('seo'),
	('docs'),
	('investors'),
	('misc'),
	('outbound'),
	('partnerships'),
	('design'),
	('talk prep'),
	('ops'),
	('eng comm'),
	('eng'),
	('computing'),
	('eng design'),
	('community'),
	('user resources'),
	('eng research'),
	('devops'),
	('compliance'),
	('product sync'),
	('growth sync'),
	('advisors');

grant all on schema timelog to public;
grant all on all tables in schema timelog to public;
grant all on all sequences in schema timelog to public;
grant all on all functions in schema timelog to public;

commit;