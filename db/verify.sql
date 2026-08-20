-- Execute after 03_transform.sql has completed.
SELECT count(*) AS source_rows FROM inside.users_surveys_responses_aux;
SELECT count(*) AS message_rows FROM messages;
SELECT count(*) AS null_created_at FROM messages WHERE created_at IS NULL;
SELECT min(created_at) AS min_created_at, max(created_at) AS max_created_at FROM messages;
SELECT channel, count(*) AS rows FROM messages GROUP BY channel ORDER BY channel;
SELECT status, count(*) AS rows FROM messages GROUP BY status ORDER BY status;
SELECT count(*) AS duplicate_ids FROM (SELECT id FROM messages GROUP BY id HAVING count(*) > 1) duplicates;

-- Re-running the transform must produce the same created_at for the same id.
SELECT count(*) AS deterministic_mismatches
FROM messages first_run
JOIN messages second_run USING (id)
WHERE first_run.created_at <> second_run.created_at;
