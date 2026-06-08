-- Migration 003: Notification history table
-- Stores every push notification sent from the dashboard so admins can
-- review what was sent, to whom, and when.

CREATE TABLE IF NOT EXISTS notifications (
  notification_id  VARCHAR(36)   NOT NULL,
  tenant_id        VARCHAR(36)   NOT NULL,
  type             ENUM(
    'station_available',
    'station_maintenance',
    'tariff_change',
    'new_station',
    'broadcast'
  )                               NOT NULL,
  title            VARCHAR(200)  NOT NULL,
  body             TEXT          NOT NULL,
  station_id       VARCHAR(36)   NULL,
  city_filter      VARCHAR(80)   NULL,
  created_by       VARCHAR(36)   NULL,
  recipients_count INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (notification_id),
  INDEX idx_notif_tenant  (tenant_id),
  INDEX idx_notif_created (created_at),
  INDEX idx_notif_type    (type)
);
