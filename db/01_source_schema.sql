CREATE SCHEMA IF NOT EXISTS inside;

CREATE TABLE IF NOT EXISTS inside.users_surveys_responses_aux (
  id BIGINT PRIMARY KEY,
  origin VARCHAR(32) NOT NULL,
  response_status_id SMALLINT NOT NULL CHECK (response_status_id BETWEEN 1 AND 6)
);