import { pool } from './db.js';

await pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY,
    channel VARCHAR(32) NOT NULL,
    status SMALLINT NOT NULL CHECK (status BETWEEN 1 AND 6),
    created_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS messages_created_channel_idx ON messages (created_at, channel);
  CREATE INDEX IF NOT EXISTS messages_channel_created_idx ON messages (channel, created_at);
  CREATE INDEX IF NOT EXISTS messages_converted_created_channel_idx
    ON messages (created_at, channel) WHERE status = 1;
`);

await pool.end();