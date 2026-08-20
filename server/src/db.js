import pg from 'pg';
import { CONVERSION_STATUS } from './conversion.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/conversions',
  max: Number(process.env.DB_POOL_MAX || 10),
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15000),
  query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS || 20000)
});

export const conversionQuery = `
  SELECT
    date_trunc($1, created_at)::date AS date,
    channel,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status = $5)::int AS converted,
    ROUND((COUNT(*) FILTER (WHERE status = $5)::numeric / NULLIF(COUNT(*), 0)) * 100, 2)::float AS rate
  FROM messages
  WHERE created_at >= $2::date
    AND created_at < ($3::date + INTERVAL '1 day')
    AND ($4::text[] IS NULL OR channel = ANY($4::text[]))
  GROUP BY 1, 2
  ORDER BY 1, 2;
`;

export async function getConversionEvolution({ from, to, channel, granularity }) {
  const channels = channel ? (Array.isArray(channel) ? channel : [channel]) : null;
  const { rows } = await pool.query(conversionQuery, [granularity, from, to, channels, CONVERSION_STATUS]);
  return rows;
}

export async function checkDatabase() {
  await pool.query('SELECT 1 FROM messages LIMIT 1');
}