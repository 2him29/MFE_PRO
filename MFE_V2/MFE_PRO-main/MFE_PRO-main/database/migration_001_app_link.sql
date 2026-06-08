-- Migration 001 — wires the Android app to the dashboard via the server.
-- Run this ONCE against your `ev_charge_dz` database (phpMyAdmin or
-- `mysql -u root ev_charge_dz < migration_001_app_link.sql`).

-- 1. Add fcm_token column on app_users. The server's
--    /api/app/auth/fcm-token endpoint already INSERTs into this column —
--    without it the call silently fails so notifications never fire.
ALTER TABLE `app_users`
  ADD COLUMN IF NOT EXISTS `fcm_token` VARCHAR(512) DEFAULT NULL
  AFTER `rfid_card_number`;

-- 2. Helper index for the FCM-fan-out query (recent session per station).
ALTER TABLE `charging_sessions`
  ADD INDEX IF NOT EXISTS `idx_sessions_station_time` (`station_id`, `start_time`);
