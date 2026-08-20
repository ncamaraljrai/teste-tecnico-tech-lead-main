-- Run after the import and transformation finish.
-- Capture actual time, buffers, scans, sort and aggregate strategy.
EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT date_trunc('day', created_at)::date AS period, channel,
       count(*)::int AS eligible_count,
       count(*) FILTER (WHERE status = 1)::int AS conversion_count
FROM messages
WHERE created_at >= DATE '2025-01-01' AND created_at < DATE '2025-01-02'
GROUP BY 1, 2 ORDER BY 1, 2;

EXPLAIN (ANALYZE, BUFFERS, SUMMARY)
SELECT date_trunc('month', created_at)::date AS period, channel,
       count(*)::int AS eligible_count,
       count(*) FILTER (WHERE status = 1)::int AS conversion_count
FROM messages
WHERE created_at >= DATE '2025-01-01' AND created_at < DATE '2026-01-01'
  AND channel = 'email'
GROUP BY 1, 2 ORDER BY 1, 2;
