begin;

drop schema if exists ats cascade;
create schema ats;
set search_path = ats;

-- Departments table
CREATE TABLE departments
(
	id         UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
	name       TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Positions table
CREATE TABLE positions
(
	id            UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
	title         TEXT NOT NULL,
	description   TEXT,
	department_id UUID REFERENCES departments (id),
	archived      boolean   default false,
	created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Candidates table
CREATE TABLE candidates
(
	id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
	name        TEXT NOT NULL,
	email       TEXT,
	phone       TEXT,
	position_id UUID REFERENCES positions (id),
	resume_url  TEXT,
	notes       text,
	status      text, -- Applied, Interviewing, Rejected before offer, Offer, Offer declined, Offer accepted
	created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Meetings table
CREATE TABLE meetings
(
	id               UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
	candidate_id     UUID REFERENCES candidates (id),
	email            TEXT,
	meeting_datetime TIMESTAMPTZ,
	location         TEXT,
	notes            TEXT,
	created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (name)
VALUES ('Engineering'),
	   ('Product Management'),
	   ('Data Science'),
	   ('Design'),
	   ('Sales'),
	   ('Marketing'),
	   ('Operations');

-- Positions
INSERT INTO positions (title, description, department_id)
VALUES ('Software Engineer', 'Develops software applications.',
		(SELECT id FROM departments WHERE name = 'Engineering')),
	   ('Product Manager', 'Manages product development and strategy.',
		(SELECT id FROM departments WHERE name = 'Product Management')),
	   ('Data Scientist', 'Analyzes and interprets complex data.',
		(SELECT id FROM departments WHERE name = 'Data Science')),
	   ('UI/UX Designer', 'Designs user interfaces and experiences.',
		(SELECT id FROM departments WHERE name = 'Design')),
	   -- Add more positions as needed
	   ('Sales Representative', 'Responsible for sales and client relationships.',
		(SELECT id FROM departments WHERE name = 'Sales')),
	   ('Marketing Specialist', 'Executes marketing campaigns and initiatives.',
		(SELECT id FROM departments WHERE name = 'Marketing')),
	   ('Operations Manager', 'Oversees day-to-day operations.',
		(SELECT id FROM departments WHERE name = 'Operations')),
	   -- Add more positions as needed
	   ('Data Engineer', 'Builds and maintains data pipelines.',
		(SELECT id FROM departments WHERE name = 'Data Science')),
	   ('Frontend Developer', 'Develops user-facing web applications.',
		(SELECT id FROM departments WHERE name = 'Engineering')),
	   ('Product Designer', 'Creates innovative product designs.', (SELECT id FROM departments WHERE name = 'Design')),
	   -- Add more positions as needed
	   ('Backend Developer', 'Develops server-side logic and APIs.',
		(SELECT id FROM departments WHERE name = 'Engineering')),
	   ('Data Analyst', 'Analyzes and interprets data to generate insights.',
		(SELECT id FROM departments WHERE name = 'Data Science')),
	   ('Sales Manager', 'Leads and manages the sales team.', (SELECT id FROM departments WHERE name = 'Sales')),
	   ('Digital Marketer', 'Executes digital marketing campaigns.',
		(SELECT id FROM departments WHERE name = 'Marketing')),
	   -- Add more positions as needed
	   ('DevOps Engineer', 'Manages infrastructure and deployment processes.',
		(SELECT id FROM departments WHERE name = 'Engineering')),
	   ('Quality Assurance Analyst', 'Ensures product quality through testing and validation.',
		(SELECT id FROM departments WHERE name = 'Engineering')),
	   ('Data Architect', 'Designs and implements data structures.',
		(SELECT id FROM departments WHERE name = 'Data Science')),
	   ('Graphic Designer', 'Creates visual content for various mediums.',
		(SELECT id FROM departments WHERE name = 'Design'));

INSERT INTO candidates (created_at, name, email, phone, position_id, resume_url, notes, status)
VALUES
	('01/1/2024','John Smith', 'john.smith@example.com', '123-456-7890', (SELECT id FROM positions WHERE title = 'Software Engineer'), 'https://resume-url.com/johnsmith', 'Experienced software developer with strong coding skills.', 'Applied'),
	('02/1/2024','Emily Johnson', 'emily.johnson@example.com', '987-654-3210', (SELECT id FROM positions WHERE title = 'Product Manager'), 'https://resume-url.com/emilyjohnson', 'Skilled in product strategy and development.', 'Applied'),
	('03/1/2024','Michael Williams', 'michael.williams@example.com', '555-123-4567', (SELECT id FROM positions WHERE title = 'Data Scientist'), 'https://resume-url.com/michaelwilliams', 'Experienced in statistical analysis and machine learning algorithms.', 'Interviewing'),
	('04/1/2024','Olivia Brown', 'olivia.brown@example.com', '222-333-4444', (SELECT id FROM positions WHERE title = 'UI/UX Designer'), 'https://resume-url.com/oliviabrown', 'Proficient in user-centered design principles and tools.', 'Applied'),
	('05/1/2024','William Johnson', 'william.johnson@example.com', '111-222-3333', (SELECT id FROM positions WHERE title = 'Sales Representative'), 'https://resume-url.com/williamjohnson', 'Experienced in B2B sales and client relationship management.', 'Rejected before offer'),
	('06/1/2024','Sophia Davis', 'sophia.davis@example.com', '444-555-6666', (SELECT id FROM positions WHERE title = 'Marketing Specialist'), 'https://resume-url.com/sophiadavis', 'Skilled in executing multi-channel marketing campaigns.', 'Offer declined'),
	('07/1/2024','Alexander Wilson', 'alexander.wilson@example.com', '777-888-9999', (SELECT id FROM positions WHERE title = 'Operations Manager'), 'https://resume-url.com/alexanderwilson', 'Experienced in overseeing day-to-day operations in a fast-paced environment.', 'Offer'),
	('08/1/2024','Isabella Martinez', 'isabella.martinez@example.com', '666-777-8888', (SELECT id FROM positions WHERE title = 'Data Engineer'), 'https://resume-url.com/isabellamartinez', 'Strong expertise in data processing and ETL pipelines.', 'Applied'),
	('09/1/2024','Mason Anderson', 'mason.anderson@example.com', '222-444-6666', (SELECT id FROM positions WHERE title = 'Frontend Developer'), 'https://resume-url.com/masonanderson', 'Skilled in modern JavaScript frameworks and responsive design.', 'Interviewing'),
	('10/1/2024','Sophia Thomas', 'sophia.thomas@example.com', '999-333-1111', (SELECT id FROM positions WHERE title = 'Product Designer'), 'https://resume-url.com/sophiathomas', 'Creative designer with a focus on user experience.', 'Offer accepted'),
	('11/1/2024','Ethan Lewis', 'ethan.lewis@example.com', '333-666-9999', (SELECT id FROM positions WHERE title = 'Backend Developer'), 'https://resume-url.com/ethanlewis', 'Experienced in building scalable and secure server-side applications.', 'Applied'),
	('01/1/2024','Ava Walker', 'ava.walker@example.com', '555-888-2222', (SELECT id FROM positions WHERE title = 'Data Analyst'), 'https://resume-url.com/avawalker', 'Skilled in data visualization and statistical analysis.', 'Interviewing'),
	('02/1/2024','James Wright', 'james.wright@example.com', '111-777-4444', (SELECT id FROM positions WHERE title = 'Sales Manager'), 'https://resume-url.com/jameswright', 'Proven track record in leading successful sales teams.', 'Rejected before offer'),
	('03/1/2024','Charlotte Thompson', 'charlotte.thompson@example.com', '444-999-1111', (SELECT id FROM positions WHERE title = 'Digital Marketer'), 'https://resume-url.com/charlottethompson', 'Experienced in developing and executing digital marketing strategies.', 'Offer declined'),
	('04/1/2024','Benjamin Garcia', 'benjamin.garcia@example.com', '888-333-5555', (SELECT id FROM positions WHERE title = 'DevOps Engineer'), 'https://resume-url.com/benjamingarcia', 'Skilled in managing cloud infrastructure and CI/CD pipelines.', 'Offer'),
	('05/1/2024','Amelia Martinez', 'amelia.martinez@example.com', '666-444-2222', (SELECT id FROM positions WHERE title = 'Quality Assurance Analyst'), 'https://resume-url.com/ameliagarcia', 'Strong attention to detail and expertise in manual and automated testing.', 'Applied'),
	('06/1/2024','Daniel Hernandez', 'daniel.hernandez@example.com', '222-555-9999', (SELECT id FROM positions WHERE title = 'Data Architect'), 'https://resume-url.com/danielhernandez', 'Experienced in designing scalable and optimized data architectures.', 'Interviewing'),
	('07/1/2024','Sophia Lopez', 'sophia.lopez@example.com', '777-999-3333', (SELECT id FROM positions WHERE title = 'Graphic Designer'), 'https://resume-url.com/sophialopez', 'Creative designer with expertise in Adobe Creative Suite.', 'Offer accepted'),
	('08/1/2024','Elijah Adams', 'elijah.adams@example.com', '111-888-5555', (SELECT id FROM positions WHERE title = 'Software Engineer'), 'https://resume-url.com/elijahadams', 'Strong programming skills in Java and C++.', 'Applied'),
	('09/1/2024','Harper Young', 'harper.young@example.com', '333-444-9999', (SELECT id FROM positions WHERE title = 'Product Manager'), 'https://resume-url.com/harperyoung', 'Experienced in product strategy and roadmap planning.', 'Rejected before offer'),
	('10/1/2024','Matthew Turner', 'matthew.turner@example.com', '555-222-9999', (SELECT id FROM positions WHERE title = 'Data Scientist'), 'https://resume-url.com/matthewturner', 'Skilled in statistical analysis and machine learning algorithms.', 'Interviewing'),
	('11/1/2024','Charlotte Walker', 'charlotte.walker@example.com', '999-777-1111', (SELECT id FROM positions WHERE title = 'UI/UX Designer'), 'https://resume-url.com/charlottewalker', 'Proficient in user-centered design principles and tools.', 'Offer declined'),
	('12/1/2024','Daniel Jackson', 'daniel.jackson@example.com', '111-333-8888', (SELECT id FROM positions WHERE title = 'Sales Representative'), 'https://resume-url.com/danieljackson', 'Experienced in B2B sales and client relationship management.', 'Offer'),
	('01/1/2024','Elizabeth Wright', 'elizabeth.wright@example.com', '444-888-5555', (SELECT id FROM positions WHERE title = 'Marketing Specialist'), 'https://resume-url.com/elizabethwright', 'Skilled in executing multi-channel marketing campaigns.', 'Applied'),
	('02/1/2024','Joseph Davis', 'joseph.davis@example.com', '777-333-9999', (SELECT id FROM positions WHERE title = 'Operations Manager'), 'https://resume-url.com/josephdavis', 'Experienced in overseeing day-to-day operations in a fast-paced environment.', 'Interviewing'),
	('03/1/2024','Evelyn Martinez', 'evelyn.martinez@example.com', '555-222-6666', (SELECT id FROM positions WHERE title = 'Data Engineer'), 'https://resume-url.com/evelynmartinez', 'Strong expertise in data processing and ETL pipelines.', 'Applied'),
	('04/1/2024','Aiden Anderson', 'aiden.anderson@example.com', '333-111-4444', (SELECT id FROM positions WHERE title = 'Frontend Developer'), 'https://resume-url.com/aidenanderson', 'Skilled in modern JavaScript frameworks and responsive design.', 'Offer declined'),
	('05/1/2024','Avery Thomas', 'avery.thomas@example.com', '999-666-3333', (SELECT id FROM positions WHERE title = 'Product Designer'), 'https://resume-url.com/averythomas', 'Creative designer with a focus on user experience.', 'Offer'),
	('06/1/2024','Benjamin Lewis', 'benjamin.lewis@example.com', '111-444-6666', (SELECT id FROM positions WHERE title = 'Backend Developer'), 'https://resume-url.com/benjaminlewis', 'Experienced in building scalable and secure server-side applications.', 'Interviewing'),
	('07/1/2024','Camila Walker', 'camila.walker@example.com', '444-777-9999', (SELECT id FROM positions WHERE title = 'Data Analyst'), 'https://resume-url.com/camilawalker', 'Skilled in data visualization and statistical analysis.', 'Offer declined'),
	('08/1/2024','William Wright', 'william.wright@example.com', '666-222-5555', (SELECT id FROM positions WHERE title = 'Sales Manager'), 'https://resume-url.com/williamwright', 'Proven track record in leading successful sales teams.', 'Offer accepted'),
	('09/1/2024','Abigail Taylor', 'abigail.taylor@example.com', '888-333-7777', (SELECT id FROM positions WHERE title = 'Digital Marketer'), 'https://resume-url.com/abigailtaylor', 'Experienced in developing and executing digital marketing strategies.', 'Applied'),
	('10/1/2024','Jackson Hernandez', 'jackson.hernandez@example.com', '333-666-9999', (SELECT id FROM positions WHERE title = 'DevOps Engineer'), 'https://resume-url.com/jacksonhernandez', 'Skilled in managing cloud infrastructure and CI/CD pipelines.', 'Rejected before offer'),
	('11/1/2024','Mia Lopez', 'mia.lopez@example.com', '111-555-7777', (SELECT id FROM positions WHERE title = 'Quality Assurance Analyst'), 'https://resume-url.com/mialopez', 'Strong attention to detail and expertise in manual and automated testing.', 'Interviewing'),
	('12/1/2024','Sofia Perez', 'sofia.perez@example.com', '666-999-2222', (SELECT id FROM positions WHERE title = 'Data Architect'), 'https://resume-url.com/sofiaperez', 'Experienced in designing scalable and optimized data architectures.', 'Offer declined'),
	('01/1/2024','Henry Davis', 'henry.davis@example.com', '555-444-2222', (SELECT id FROM positions WHERE title = 'Graphic Designer'), 'https://resume-url.com/henrydavis', 'Creative designer with expertise in Adobe Creative Suite.', 'Offer'),
	('01/1/2024','Victoria Adams', 'victoria.adams@example.com', '111-777-5555', (SELECT id FROM positions WHERE title = 'Software Engineer'), 'https://resume-url.com/victoriaadams', 'Strong programming skills in Java and C++.', 'Applied'),
	('02/1/2024','Charles Young', 'charles.young@example.com', '333-444-6666', (SELECT id FROM positions WHERE title = 'Product Manager'), 'https://resume-url.com/charlesyoung', 'Experienced in product strategy and roadmap planning.', 'Offer accepted'),
	('03/1/2024','Daniel Turner', 'daniel.turner@example.com', '555-222-9999', (SELECT id FROM positions WHERE title = 'Data Scientist'), 'https://resume-url.com/danielturner', 'Skilled in statistical analysis and machine learning algorithms.', 'Applied'),
	('04/1/2024','Samantha Walker', 'samantha.walker@example.com', '999-777-1111', (SELECT id FROM positions WHERE title = 'UI/UX Designer'), 'https://resume-url.com/samanthawalker', 'Proficient in user-centered design principles and tools.', 'Interviewing'),
	('05/1/2024','Joseph Jackson', 'joseph.jackson@example.com', '111-333-8888', (SELECT id FROM positions WHERE title = 'Sales Representative'), 'https://resume-url.com/josephjackson', 'Experienced in B2B sales and client relationship management.', 'Offer declined'),
	('06/1/2024','Natalie Wright', 'natalie.wright@example.com', '444-888-5555', (SELECT id FROM positions WHERE title = 'Marketing Specialist'), 'https://resume-url.com/nataliewright', 'Skilled in executing multi-channel marketing campaigns.', 'Offer'),
	('07/1/2024','Andrew Davis', 'andrew.davis@example.com', '777-333-9999', (SELECT id FROM positions WHERE title = 'Operations Manager'), 'https://resume-url.com/andrewdavis', 'Experienced in overseeing day-to-day operations in a fast-paced environment.', 'Applied'),
	('08/1/2024','Hannah Martinez', 'hannah.martinez@example.com', '555-222-6666', (SELECT id FROM positions WHERE title = 'Data Engineer'), 'https://resume-url.com/hannahmartinez', 'Strong expertise in data processing and ETL pipelines.', 'Offer declined'),
	('09/1/2024','William Anderson', 'william.anderson@example.com', '333-111-4444', (SELECT id FROM positions WHERE title = 'Frontend Developer'), 'https://resume-url.com/williamanderson', 'Skilled in modern JavaScript frameworks and responsive design.', 'Interviewing'),
	('10/1/2024','Oliver Thomas', 'oliver.thomas@example.com', '999-666-3333', (SELECT id FROM positions WHERE title = 'Product Designer'), 'https://resume-url.com/oliverthomas', 'Creative designer with a focus on user experience.', 'Offer'),
	('11/1/2024','Elijah Lewis', 'elijah.lewis@example.com', '111-444-6666', (SELECT id FROM positions WHERE title = 'Backend Developer'), 'https://resume-url.com/elijahlewis', 'Experienced in building scalable and secure server-side applications.', 'Applied'),
	('12/1/2024','Grace Walker', 'grace.walker@example.com', '444-777-9999', (SELECT id FROM positions WHERE title = 'Data Analyst'), 'https://resume-url.com/gracewalker', 'Skilled in data visualization and statistical analysis.', 'Rejected before offer'),
	('01/1/2024','Samuel Wright', 'samuel.wright@example.com', '666-222-5555', (SELECT id FROM positions WHERE title = 'Sales Manager'), 'https://resume-url.com/samuelwright', 'Proven track record in leading successful sales teams.', 'Interviewing'),
	('02/1/2024','Lillian Taylor', 'lillian.taylor@example.com', '888-333-7777', (SELECT id FROM positions WHERE title = 'Digital Marketer'), 'https://resume-url.com/lilliantaylor', 'Experienced in developing and executing digital marketing strategies.', 'Offer'),
	('03/1/2024','John Hernandez', 'john.hernandez@example.com', '333-666-9999', (SELECT id FROM positions WHERE title = 'DevOps Engineer'), 'https://resume-url.com/johnhernandez', 'Skilled in managing cloud infrastructure and CI/CD pipelines.', 'Applied'),
	('04/1/2024','Ella Lopez', 'ella.lopez@example.com', '111-555-7777', (SELECT id FROM positions WHERE title = 'Quality Assurance Analyst'), 'https://resume-url.com/ellalopez', 'Strong attention to detail and expertise in manual and automated testing.', 'Offer declined'),
	('05/1/2024','David Perez', 'david.perez@example.com', '666-999-2222', (SELECT id FROM positions WHERE title = 'Data Architect'), 'https://resume-url.com/davidperez', 'Experienced in designing scalable and optimized data architectures.', 'Offer accepted'),
	('06/1/2024','Sofia Davis', 'sofia.davis@example.com', '555-444-2222', (SELECT id FROM positions WHERE title = 'Graphic Designer'), 'https://resume-url.com/sofiadavis', 'Creative designer with expertise in Adobe Creative Suite.', 'Applied');

grant all on schema ats to public;
grant all on all tables in schema ats to public;
grant all on all sequences in schema ats to public;
grant all on all functions in schema ats to public;

commit;