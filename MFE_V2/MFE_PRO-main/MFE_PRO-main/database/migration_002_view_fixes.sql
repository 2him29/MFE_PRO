-- Migration 002 — adds deleted_at to stations and fixes vw_app_station_map.
-- Run ONCE: paste into phpMyAdmin SQL tab → Go

-- 1. Add soft-delete column (safe to re-run — IF NOT EXISTS)
ALTER TABLE `stations`
  ADD COLUMN IF NOT EXISTS `deleted_at` TIMESTAMP NULL DEFAULT NULL
  AFTER `updated_at`;

-- 2. Recreate the app map view to exclude soft-deleted stations
DROP VIEW IF EXISTS `vw_app_station_map`;

CREATE VIEW `vw_app_station_map` AS
SELECT
    s.station_id                                                         AS id,
    s.name,
    s.address,
    s.city,
    s.latitude                                                           AS lat,
    s.longitude                                                          AS lng,
    s.status,
    (EXISTS (
        SELECT 1 FROM connectors c2
        WHERE c2.station_id = s.station_id AND c2.status = 'available'
    ))                                                                   AS available,
    MAX(c.max_power_kw)                                                  AS max_power_kw,
    CONCAT(MAX(c.max_power_kw), ' kW')                                  AS power,
    CONCAT(s.current_tariff_dzd_per_kwh, ' DZD/kWh')                   AS price,
    COUNT(c.connector_id)                                                AS total_connectors,
    COUNT(CASE WHEN c.status = 'available' THEN 1 END)                  AS available_connectors,
    GROUP_CONCAT(DISTINCT c.connector_type ORDER BY c.connector_type SEPARATOR ', ') AS connector_types
FROM stations s
JOIN connectors c ON c.station_id = s.station_id
WHERE s.status != 'offline'
  AND s.deleted_at IS NULL
GROUP BY
    s.station_id, s.name, s.address, s.city,
    s.latitude, s.longitude, s.status,
    s.current_tariff_dzd_per_kwh;
