DROP TABLE IF EXISTS messages;

CREATE TABLE messages AS
SELECT
  id,
  origin AS channel,
  response_status_id AS status,
  TIMESTAMPTZ '2025-01-01 00:00:00+00'
    + ((id % 365)::int * INTERVAL '1 day')
    + ((id % 86400)::int * INTERVAL '1 second') AS created_at
FROM inside.users_surveys_responses_aux;

ALTER TABLE messages ADD PRIMARY KEY (id);
ALTER TABLE messages ALTER COLUMN channel SET NOT NULL;
ALTER TABLE messages ALTER COLUMN status SET NOT NULL;
ALTER TABLE messages ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status BETWEEN 1 AND 6);

CREATE INDEX messages_created_channel_idx ON messages (created_at, channel);
CREATE INDEX messages_channel_created_idx ON messages (channel, created_at);
CREATE INDEX messages_converted_created_channel_idx
  ON messages (created_at, channel) WHERE status = 1;

ANALYZE messages;