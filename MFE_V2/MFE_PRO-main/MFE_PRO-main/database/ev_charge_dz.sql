-- ============================================================
-- EV Charge DZ — MySQL Database
-- Structured for MVVM architecture
--
-- LAYER MAPPING:
--   MODEL      → Tables  (raw entities, source of truth)
--   VIEWMODEL  → Views   (pre-shaped data, one view per ViewModel)
--   VIEW (UI)  → consumed by React dashboard + Kotlin/Compose app
-- ============================================================

CREATE DATABASE IF NOT EXISTS ev_charge_dz
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ev_charge_dz;


-- ============================================================
-- ██ MODEL LAYER — Tables
-- Raw normalized data. No business logic, no joins.
-- ============================================================


-- ------------------------------------------------------------
-- tenants
-- Every entity in the system belongs to one tenant.
-- ------------------------------------------------------------


CREATE TABLE tenants (
    tenant_id         VARCHAR(36)  NOT NULL,
    name              VARCHAR(100) NOT NULL,
    logo              VARCHAR(255),
    accent_color      VARCHAR(20),
    accent_color_dark VARCHAR(20),
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id)
);

-- ------------------------------------------------------------
-- users  (dashboard staff: admins, technicians)
-- Not to be confused with mobile app users.
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id            VARCHAR(36)  NOT NULL,
    tenant_id          VARCHAR(36)  NOT NULL,
    email              VARCHAR(255) NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    full_name          VARCHAR(100) NOT NULL,
    role               ENUM('super_admin','tenant_admin','technician') NOT NULL,
    status             ENUM('active','suspended') NOT NULL DEFAULT 'active',
    privilege_template VARCHAR(100),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE  KEY uq_users_email (email),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- ------------------------------------------------------------
-- privileges + user_privileges  (fine-grained dashboard RBAC)
-- ------------------------------------------------------------
CREATE TABLE privileges (
    privilege_key VARCHAR(100) NOT NULL,
    label         VARCHAR(150) NOT NULL,
    PRIMARY KEY (privilege_key)
);

CREATE TABLE user_privileges (
    user_id       VARCHAR(36)  NOT NULL,
    privilege_key VARCHAR(100) NOT NULL,
    granted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, privilege_key),
    FOREIGN KEY (user_id)       REFERENCES users(user_id),
    FOREIGN KEY (privilege_key) REFERENCES privileges(privilege_key)
);

-- ------------------------------------------------------------
-- app_users  (mobile app — login / sign-up)
-- Maps to the Android "Auth User" actor in the use-case diagram.
-- ------------------------------------------------------------
CREATE TABLE app_users (
    app_user_id      VARCHAR(36)  NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(100) NOT NULL,
    phone            VARCHAR(30),
    rfid_card_number VARCHAR(50),
    status           ENUM('active','suspended') NOT NULL DEFAULT 'active',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (app_user_id),
    UNIQUE KEY uq_app_users_email (email),
    UNIQUE KEY uq_app_users_rfid  (rfid_card_number)
);

-- ------------------------------------------------------------
-- stations
-- Shared core: dashboard manages them, app displays them on map.
-- ------------------------------------------------------------
CREATE TABLE stations (
    station_id                 VARCHAR(36)   NOT NULL,
    tenant_id                  VARCHAR(36)   NOT NULL,
    name                       VARCHAR(150)  NOT NULL,
    city                       VARCHAR(100)  NOT NULL,
    address                    VARCHAR(255)  NOT NULL,
    status                     ENUM('available','charging','offline','fault','maintenance') NOT NULL DEFAULT 'available',
    latitude                   DECIMAL(10,7) NOT NULL,
    longitude                  DECIMAL(10,7) NOT NULL,
    current_tariff_dzd_per_kwh DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
    created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at                 TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (station_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    INDEX idx_stations_tenant   (tenant_id),
    INDEX idx_stations_status   (status),
    INDEX idx_stations_location (latitude, longitude)
);

-- ------------------------------------------------------------
-- connectors  (one station → many connectors)
-- Maps to the app's `power` / `connector_type` fields.
-- ------------------------------------------------------------
CREATE TABLE connectors (
    connector_id   VARCHAR(36)  NOT NULL,
    station_id     VARCHAR(36)  NOT NULL,
    connector_code VARCHAR(50)  NOT NULL,
    connector_type VARCHAR(50)  NOT NULL,
    max_power_kw   DECIMAL(6,2) NOT NULL,
    status         ENUM('available','charging','offline','fault','maintenance') NOT NULL DEFAULT 'available',
    PRIMARY KEY (connector_id),
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    INDEX idx_connectors_station (station_id),
    INDEX idx_connectors_status  (status)
);

-- ------------------------------------------------------------
-- charging_sessions
-- Bridge between app (starts session) and dashboard (reads it).
-- app_user_id nullable → supports RFID-only sessions.
-- ------------------------------------------------------------
CREATE TABLE charging_sessions (
    session_id      VARCHAR(36)   NOT NULL,
    tenant_id       VARCHAR(36)   NOT NULL,
    station_id      VARCHAR(36)   NOT NULL,
    connector_id    VARCHAR(36)   NOT NULL,
    app_user_id     VARCHAR(36),
    user_identifier VARCHAR(100)  NOT NULL,
    payment_method  ENUM('rfid_card','cib','epayment') NOT NULL,
    start_time      TIMESTAMP     NOT NULL,
    end_time        TIMESTAMP     NULL,
    duration_min    INT           NOT NULL DEFAULT 0,
    energy_kwh      DECIMAL(8,3)  NOT NULL DEFAULT 0.000,
    cost_dzd        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status          ENUM('active','completed','stopped','error') NOT NULL DEFAULT 'active',
    PRIMARY KEY (session_id),
    FOREIGN KEY (tenant_id)    REFERENCES tenants(tenant_id),
    FOREIGN KEY (station_id)   REFERENCES stations(station_id),
    FOREIGN KEY (connector_id) REFERENCES connectors(connector_id),
    FOREIGN KEY (app_user_id)  REFERENCES app_users(app_user_id),
    INDEX idx_sessions_tenant    (tenant_id),
    INDEX idx_sessions_station   (station_id),
    INDEX idx_sessions_connector (connector_id),
    INDEX idx_sessions_user      (app_user_id),
    INDEX idx_sessions_status    (status),
    INDEX idx_sessions_start     (start_time)
);

-- ------------------------------------------------------------
-- tickets + ticket_activities
-- ------------------------------------------------------------
CREATE TABLE tickets (
    ticket_id           VARCHAR(36)  NOT NULL,
    tenant_id           VARCHAR(36)  NOT NULL,
    station_id          VARCHAR(36)  NOT NULL,
    created_by_user_id  VARCHAR(36),
    assigned_to_user_id VARCHAR(36),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    category  ENUM('power_failure','screen_issue','charger_fault','system_failure','network_issue','maintenance') NOT NULL,
    priority  ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    status    ENUM('open','in_progress','resolved','escalated') NOT NULL DEFAULT 'open',
    sla_deadline TIMESTAMP NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ticket_id),
    FOREIGN KEY (tenant_id)           REFERENCES tenants(tenant_id),
    FOREIGN KEY (station_id)          REFERENCES stations(station_id),
    FOREIGN KEY (created_by_user_id)  REFERENCES users(user_id),
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(user_id),
    INDEX idx_tickets_tenant   (tenant_id),
    INDEX idx_tickets_station  (station_id),
    INDEX idx_tickets_status   (status),
    INDEX idx_tickets_priority (priority),
    INDEX idx_tickets_assigned (assigned_to_user_id)
);

CREATE TABLE ticket_activities (
    activity_id   VARCHAR(36)  NOT NULL,
    ticket_id     VARCHAR(36)  NOT NULL,
    actor_user_id VARCHAR(36),
    action        VARCHAR(100) NOT NULL,
    details       TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (activity_id),
    FOREIGN KEY (ticket_id)     REFERENCES tickets(ticket_id),
    FOREIGN KEY (actor_user_id) REFERENCES users(user_id),
    INDEX idx_ticket_activities_ticket (ticket_id)
);

-- ------------------------------------------------------------
-- billing_records
-- ------------------------------------------------------------
CREATE TABLE billing_records (
    billing_id          VARCHAR(36)   NOT NULL,
    tenant_id           VARCHAR(36)   NOT NULL,
    station_id          VARCHAR(36)   NOT NULL,
    invoice_number      VARCHAR(100)  NOT NULL,
    sessions_count      INT           NOT NULL DEFAULT 0,
    energy_kwh          DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    amount_dzd          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status              ENUM('paid','unpaid','refund') NOT NULL DEFAULT 'unpaid',
    payment_method      ENUM('rfid_card','cib','epayment') NOT NULL,
    processing_time_sec DECIMAL(10,3),
    failed              BOOLEAN NOT NULL DEFAULT FALSE,
    billed_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (billing_id),
    UNIQUE KEY uq_billing_invoice (invoice_number),
    FOREIGN KEY (tenant_id)  REFERENCES tenants(tenant_id),
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    INDEX idx_billing_tenant  (tenant_id),
    INDEX idx_billing_station (station_id),
    INDEX idx_billing_status  (status),
    INDEX idx_billing_date    (billed_at)
);

-- ------------------------------------------------------------
-- alerts
-- ------------------------------------------------------------
CREATE TABLE alerts (
    alert_id   VARCHAR(36) NOT NULL,
    tenant_id  VARCHAR(36) NOT NULL,
    station_id VARCHAR(36),
    ticket_id  VARCHAR(36),
    severity   ENUM('info','warning','error') NOT NULL DEFAULT 'info',
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (alert_id),
    FOREIGN KEY (tenant_id)  REFERENCES tenants(tenant_id),
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    FOREIGN KEY (ticket_id)  REFERENCES tickets(ticket_id),
    INDEX idx_alerts_tenant   (tenant_id),
    INDEX idx_alerts_severity (severity),
    INDEX idx_alerts_unread   (is_read, created_at)
);


-- ============================================================
-- ██ VIEWMODEL LAYER — MySQL Views
-- One view per ViewModel. No raw table joins in app code.
-- Each view returns the exact shape a screen/component needs.
-- ============================================================


-- ------------------------------------------------------------
-- vw_tenant_kpis
-- → DashboardViewModel (dashboard home / stats cards)
-- Gives each tenant their live KPIs in one query.
-- ------------------------------------------------------------
CREATE VIEW vw_tenant_kpis AS
SELECT
    t.tenant_id,
    t.name                                                              AS tenant_name,
    COUNT(DISTINCT s.station_id)                                        AS total_stations,
    COUNT(DISTINCT CASE WHEN s.status = 'available'  THEN s.station_id END) AS stations_available,
    COUNT(DISTINCT CASE WHEN s.status = 'fault'
                          OR s.status = 'maintenance' THEN s.station_id END) AS stations_offline,
    COUNT(DISTINCT c.connector_id)                                      AS total_connectors,
    COUNT(DISTINCT CASE WHEN cs.status = 'active'    THEN cs.session_id END) AS active_sessions,
    COUNT(DISTINCT CASE WHEN tk.status IN ('open','in_progress','escalated')
                                                     THEN tk.ticket_id  END) AS open_tickets,
    COALESCE(SUM(CASE WHEN cs.status = 'completed'   THEN cs.energy_kwh END), 0) AS total_energy_kwh,
    COALESCE(SUM(CASE WHEN cs.status = 'completed'   THEN cs.cost_dzd   END), 0) AS total_revenue_dzd
FROM tenants t
LEFT JOIN stations         s  ON s.tenant_id  = t.tenant_id
LEFT JOIN connectors       c  ON c.station_id = s.station_id
LEFT JOIN charging_sessions cs ON cs.tenant_id = t.tenant_id
LEFT JOIN tickets          tk ON tk.tenant_id  = t.tenant_id
GROUP BY t.tenant_id, t.name;


-- ------------------------------------------------------------
-- vw_station_overview
-- → StationsViewModel (dashboard stations list/map page)
-- Station row with live connector + session aggregates.
-- ------------------------------------------------------------
CREATE VIEW vw_station_overview AS
SELECT
    s.station_id,
    s.tenant_id,
    s.name,
    s.city,
    s.address,
    s.status,
    s.latitude,
    s.longitude,
    s.current_tariff_dzd_per_kwh,
    s.updated_at,
    COUNT(DISTINCT c.connector_id)                                          AS total_connectors,
    COUNT(DISTINCT CASE WHEN c.status = 'available' THEN c.connector_id END) AS available_connectors,
    COUNT(DISTINCT CASE WHEN cs.status = 'active'   THEN cs.session_id  END) AS active_sessions,
    COUNT(DISTINCT CASE WHEN a.is_read = FALSE       THEN a.alert_id    END) AS unread_alerts,
    MAX(a.severity)                                                          AS worst_alert_severity,
    MAX(c.max_power_kw)                                                      AS max_power_kw,
    GROUP_CONCAT(DISTINCT c.connector_type ORDER BY c.connector_type SEPARATOR ', ') AS connector_types
FROM stations s
LEFT JOIN connectors        c  ON c.station_id  = s.station_id
LEFT JOIN charging_sessions cs ON cs.station_id = s.station_id AND cs.status = 'active'
LEFT JOIN alerts            a  ON a.station_id  = s.station_id
WHERE s.deleted_at IS NULL
GROUP BY s.station_id;


-- ------------------------------------------------------------
-- vw_session_list
-- → SessionsViewModel (dashboard sessions table)
-- Flat row: session + station name + connector info + user name.
-- ------------------------------------------------------------
CREATE VIEW vw_session_list AS
SELECT
    cs.session_id,
    cs.tenant_id,
    cs.station_id,
    s.name                          AS station_name,
    s.city                          AS station_city,
    cs.connector_id,
    c.connector_type,
    c.max_power_kw,
    cs.app_user_id,
    au.full_name                    AS user_name,
    au.email                        AS user_email,
    cs.user_identifier,
    cs.payment_method,
    cs.start_time,
    cs.end_time,
    cs.duration_min,
    cs.energy_kwh,
    cs.cost_dzd,
    cs.status
FROM charging_sessions cs
JOIN stations   s  ON s.station_id   = cs.station_id
JOIN connectors c  ON c.connector_id = cs.connector_id
LEFT JOIN app_users au ON au.app_user_id = cs.app_user_id;


-- ------------------------------------------------------------
-- vw_ticket_list
-- → TicketsViewModel (dashboard tickets table)
-- Resolves user FKs to names so the component gets display-ready data.
-- ------------------------------------------------------------
CREATE VIEW vw_ticket_list AS
SELECT
    t.ticket_id,
    t.tenant_id,
    t.station_id,
    s.name                          AS station_name,
    t.created_by_user_id,
    uc.full_name                    AS created_by_name,
    t.assigned_to_user_id,
    ua.full_name                    AS assigned_to_name,
    t.title,
    t.description,
    t.category,
    t.priority,
    t.status,
    t.sla_deadline,
    t.created_at,
    t.updated_at
FROM tickets t
JOIN stations s  ON s.station_id = t.station_id
LEFT JOIN users uc ON uc.user_id = t.created_by_user_id
LEFT JOIN users ua ON ua.user_id = t.assigned_to_user_id;


-- ------------------------------------------------------------
-- vw_alert_list
-- → AlertsViewModel (dashboard alerts/notifications panel)
-- ------------------------------------------------------------
CREATE VIEW vw_alert_list AS
SELECT
    a.alert_id,
    a.tenant_id,
    a.station_id,
    s.name                          AS station_name,
    a.ticket_id,
    t.title                         AS ticket_title,
    a.severity,
    a.message,
    a.is_read,
    a.created_at
FROM alerts a
LEFT JOIN stations s ON s.station_id = a.station_id
LEFT JOIN tickets  t ON t.ticket_id  = a.ticket_id;


-- ------------------------------------------------------------
-- vw_billing_list
-- → BillingViewModel (dashboard billing records table)
-- ------------------------------------------------------------
CREATE VIEW vw_billing_list AS
SELECT
    br.billing_id,
    br.tenant_id,
    tn.name                         AS tenant_name,
    br.station_id,
    s.name                          AS station_name,
    br.invoice_number,
    br.sessions_count,
    br.energy_kwh,
    br.amount_dzd,
    br.status,
    br.payment_method,
    br.processing_time_sec,
    br.failed,
    br.billed_at
FROM billing_records br
JOIN tenants tn ON tn.tenant_id  = br.tenant_id
JOIN stations s ON s.station_id  = br.station_id;


-- ------------------------------------------------------------
-- vw_app_station_map
-- → Android MapViewModel / StationListViewModel
-- Matches the ChargingStation data class exactly.
-- Returns only stations that are not permanently offline.
-- ------------------------------------------------------------
CREATE VIEW vw_app_station_map AS
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


-- ------------------------------------------------------------
-- vw_app_session_history
-- → Android SessionHistoryViewModel (user's past charges)
-- ------------------------------------------------------------
CREATE VIEW vw_app_session_history AS
SELECT
    cs.session_id,
    cs.app_user_id,
    cs.station_id,
    s.name                          AS station_name,
    s.address                       AS station_address,
    cs.connector_id,
    c.connector_type,
    c.max_power_kw,
    cs.payment_method,
    cs.start_time,
    cs.end_time,
    cs.duration_min,
    cs.energy_kwh,
    cs.cost_dzd,
    cs.status
FROM charging_sessions cs
JOIN stations   s ON s.station_id   = cs.station_id
JOIN connectors c ON c.connector_id = cs.connector_id
WHERE cs.app_user_id IS NOT NULL;


-- ============================================================
-- SEED — Default privilege catalogue
-- ============================================================
INSERT INTO privileges (privilege_key, label) VALUES
  ('view_dashboard',    'View Dashboard'),
  ('manage_stations',   'Manage Stations'),
  ('manage_connectors', 'Manage Connectors'),
  ('view_sessions',     'View Charging Sessions'),
  ('manage_tickets',    'Manage Tickets'),
  ('assign_tickets',    'Assign Tickets'),
  ('view_billing',      'View Billing Records'),
  ('manage_billing',    'Manage Billing Records'),
  ('view_alerts',       'View Alerts'),
  ('manage_users',      'Manage Users'),
  ('manage_tenants',    'Manage Tenants');

-- ============================================================
-- SEED — Tenants  (IDs must match frontend TenantId type)
-- ============================================================
INSERT INTO tenants (tenant_id, name, accent_color, accent_color_dark) VALUES
  ('sonelgaz', 'Sonelgaz', '#f97316', '#ea580c'),
  ('saeig',    'SAEIG',    '#2563eb', '#1d4ed8');

-- ============================================================
-- NOTE: Do NOT insert users here (password_hash needs bcrypt).
-- Run:  cd server && npm run seed
-- That script creates the first super_admin account.
-- ============================================================
