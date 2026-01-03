-- ============================================================================
-- Configure Spark Notifications
-- ============================================================================
-- Sets up the edge function URL for spark notifications

INSERT INTO app_configuration (key, value)
VALUES ('spark_notification_url', 'https://hyidfsfvqlsimefixfhc.supabase.co/functions/v1/send-spark-notification')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
