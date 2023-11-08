begin;

INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (8, 'Pikachu', 'Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png', '2022-03-17 18:06:40.25+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (5, 'Charmander', 'It has a preference for hot things. When it rains, steam is said to spout from the tip of its tail.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/004.png', '2022-03-08 16:19:13.970657+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (6, 'Bulbasaur', 'There is a plant seed on its back right from the day this Pokémon is born. The seed slowly grows larger.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/001.png', '2022-03-11 03:01:46.021406+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (7, 'Squirtle', 'When it retracts its long neck into its shell, it squirts out water with vigorous force.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/007.png', '2022-03-17 17:44:57.442837+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (10, 'Rattata', 'Will chew on anything with its fangs. If you see one, you can be certain that 40 more live in the area.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/019.png', '2022-03-17 18:07:18.175796+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (11, 'Pidgey', 'Very docile. If attacked, it will often kick up sand to protect itself rather than fight back.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/016.png', '2022-03-17 18:07:53.323738+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (12, 'Butterfree', 'In battle, it flaps its wings at great speed to release highly toxic dust into the air.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/012.png', '2022-03-17 18:08:07.248343+00');
INSERT INTO entries (id, name, description, "imageUrl", inserted_at) VALUES (13, 'Caterpie', 'For protection, it releases a horrible stench from the antenna on its head to drive away enemies.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/010.png', '2022-03-17 18:08:18.907813+00');

SELECT pg_catalog.setval('entries_id_seq', 14);

commit;