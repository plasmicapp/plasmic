begin;

drop table if exists entries;
drop sequence if exists entries_id_seq cascade;

CREATE TABLE entries (
    id integer NOT NULL,
    name text,
    description text,
    "imageUrl" text,
    inserted_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE entries_id_seq OWNED BY entries.id;

ALTER TABLE ONLY entries ALTER COLUMN id SET DEFAULT nextval('entries_id_seq'::regclass);

ALTER TABLE ONLY entries
    ADD CONSTRAINT entries_pkey PRIMARY KEY (id);

commit;