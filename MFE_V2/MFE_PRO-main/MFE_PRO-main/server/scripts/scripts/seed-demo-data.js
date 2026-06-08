"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Demo operational data for the EV Charge DZ dashboard.
 *
 * Safe to run multiple times: every row uses a stable ID / invoice number and
 * ON DUPLICATE KEY UPDATE so the dashboard gets refreshed, not duplicated.
 */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../src/db"));
const now = new Date();
function daysAgo(days, hour = 9, minute = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d;
}
function minutesAgo(minutes) {
    return new Date(now.getTime() - minutes * 60000);
}
const appUsers = [
    ['APP-001', 'mohamed.amine@example.dz', 'Mohamed Amine', '+213555100001', 'RFID-7894523'],
    ['APP-002', 'sarah.ben@example.dz', 'Sarah Benali', '+213555100002', 'RFID-9876543'],
    ['APP-003', 'nadia.k@example.dz', 'Nadia Khelifi', '+213555100003', 'RFID-4561237'],
    ['APP-004', 'yacine.m@example.dz', 'Yacine Meziane', '+213555100004', 'RFID-1239874'],
];
// 12 stations — mirrors mockData.ts exactly (same names, coords, statuses)
const stations = [
    // ── Sonelgaz ──────────────────────────────────────────────────────────────
    ['STN-SG-001', 'sonelgaz', 'Alger Centre Station', 'Alger', '15 Rue Didouche Mourad, Alger Centre', 'available', 36.7538, 3.0588, 35],
    ['STN-SG-002', 'sonelgaz', 'Oran Seaside Hub', 'Oran', 'Boulevard de la Soummam, Oran', 'charging', 35.6969, -0.6331, 32],
    ['STN-SG-003', 'sonelgaz', 'Constantine Plaza', 'Constantine', 'Place 1er Novembre, Constantine', 'fault', 36.3650, 6.6147, 28],
    ['STN-SG-004', 'sonelgaz', 'Bejaia Business Park', 'Bejaia', "Zone d'Activites, Bejaia", 'available', 36.7525, 5.0689, 33],
    ['STN-SG-005', 'sonelgaz', 'Setif Highway Hub', 'Setif', 'Autoroute Est-Ouest, Setif', 'charging', 36.1905, 5.4106, 36],
    ['STN-SG-006', 'sonelgaz', 'Tizi Ouzou Central', 'Tizi Ouzou', 'Boulevard Stiti Ali, Tizi Ouzou', 'available', 36.7167, 4.0500, 30],
    // ── SAEIG ─────────────────────────────────────────────────────────────────
    ['STN-SE-001', 'saeig', 'Annaba Port Station', 'Annaba', 'Avenue de la Liberation, Annaba', 'available', 36.9000, 7.7667, 38],
    ['STN-SE-002', 'saeig', 'Blida Industrial Zone', 'Blida', 'Zone Industrielle, Blida', 'charging', 36.4704, 2.8277, 40],
    ['STN-SE-003', 'saeig', 'Tlemcen Gateway', 'Tlemcen', 'Avenue de la Marne, Tlemcen', 'offline', 34.8886, -1.3150, 30],
    ['STN-SE-004', 'saeig', 'Batna Mountain Station', 'Batna', 'Route Nationale 31, Batna', 'available', 35.5559, 6.1742, 34],
    ['STN-SE-005', 'saeig', 'Mostaganem Coastal', 'Mostaganem', 'Front de Mer, Mostaganem', 'charging', 35.9316, 0.0891, 31],
    ['STN-SE-006', 'saeig', 'Djelfa Transit Point', 'Djelfa', 'Route Nationale 1, Djelfa', 'maintenance', 34.6704, 3.2631, 37],
];
const connectors = [
    // Alger Centre — CCS2 ×4
    ['CON-SG-001-A', 'STN-SG-001', 'CCS2-01', 'CCS2', 240, 'available'],
    ['CON-SG-001-B', 'STN-SG-001', 'CCS2-02', 'CCS2', 240, 'available'],
    ['CON-SG-001-C', 'STN-SG-001', 'CCS2-03', 'CCS2', 240, 'available'],
    ['CON-SG-001-D', 'STN-SG-001', 'CCS2-04', 'CCS2', 240, 'available'],
    // Oran Seaside — CHAdeMO ×3 (charging)
    ['CON-SG-002-A', 'STN-SG-002', 'CHA-01', 'CHAdeMO', 60, 'charging'],
    ['CON-SG-002-B', 'STN-SG-002', 'CHA-02', 'CHAdeMO', 60, 'charging'],
    ['CON-SG-002-C', 'STN-SG-002', 'CHA-03', 'CHAdeMO', 60, 'charging'],
    // Constantine — Type 2 ×2 (fault)
    ['CON-SG-003-A', 'STN-SG-003', 'TYPE2-01', 'Type 2', 22, 'fault'],
    ['CON-SG-003-B', 'STN-SG-003', 'TYPE2-02', 'Type 2', 22, 'fault'],
    // Bejaia — CHAdeMO ×2
    ['CON-SG-004-A', 'STN-SG-004', 'CHA-01', 'CHAdeMO', 60, 'available'],
    ['CON-SG-004-B', 'STN-SG-004', 'CHA-02', 'CHAdeMO', 60, 'available'],
    // Setif — CCS2 ×4 (1 charging)
    ['CON-SG-005-A', 'STN-SG-005', 'CCS2-01', 'CCS2', 240, 'charging'],
    ['CON-SG-005-B', 'STN-SG-005', 'CCS2-02', 'CCS2', 240, 'available'],
    ['CON-SG-005-C', 'STN-SG-005', 'CCS2-03', 'CCS2', 240, 'available'],
    ['CON-SG-005-D', 'STN-SG-005', 'CCS2-04', 'CCS2', 240, 'available'],
    // Tizi Ouzou — Type 2 ×3
    ['CON-SG-006-A', 'STN-SG-006', 'TYPE2-01', 'Type 2', 22, 'available'],
    ['CON-SG-006-B', 'STN-SG-006', 'TYPE2-02', 'Type 2', 22, 'available'],
    ['CON-SG-006-C', 'STN-SG-006', 'TYPE2-03', 'Type 2', 22, 'available'],
    // Annaba — CCS2 ×6
    ['CON-SE-001-A', 'STN-SE-001', 'CCS2-01', 'CCS2', 240, 'available'],
    ['CON-SE-001-B', 'STN-SE-001', 'CCS2-02', 'CCS2', 240, 'available'],
    ['CON-SE-001-C', 'STN-SE-001', 'CCS2-03', 'CCS2', 240, 'available'],
    ['CON-SE-001-D', 'STN-SE-001', 'CCS2-04', 'CCS2', 240, 'available'],
    ['CON-SE-001-E', 'STN-SE-001', 'CCS2-05', 'CCS2', 240, 'available'],
    ['CON-SE-001-F', 'STN-SE-001', 'CCS2-06', 'CCS2', 240, 'available'],
    // Blida — CCS2 ×4 (2 charging)
    ['CON-SE-002-A', 'STN-SE-002', 'CCS2-01', 'CCS2', 240, 'charging'],
    ['CON-SE-002-B', 'STN-SE-002', 'CCS2-02', 'CCS2', 240, 'charging'],
    ['CON-SE-002-C', 'STN-SE-002', 'CCS2-03', 'CCS2', 240, 'available'],
    ['CON-SE-002-D', 'STN-SE-002', 'CCS2-04', 'CCS2', 240, 'available'],
    // Tlemcen — Type 2 ×3 (offline)
    ['CON-SE-003-A', 'STN-SE-003', 'TYPE2-01', 'Type 2', 22, 'offline'],
    ['CON-SE-003-B', 'STN-SE-003', 'TYPE2-02', 'Type 2', 22, 'offline'],
    ['CON-SE-003-C', 'STN-SE-003', 'TYPE2-03', 'Type 2', 22, 'offline'],
    // Batna — CHAdeMO ×3
    ['CON-SE-004-A', 'STN-SE-004', 'CHA-01', 'CHAdeMO', 60, 'available'],
    ['CON-SE-004-B', 'STN-SE-004', 'CHA-02', 'CHAdeMO', 60, 'available'],
    ['CON-SE-004-C', 'STN-SE-004', 'CHA-03', 'CHAdeMO', 60, 'available'],
    // Mostaganem — Type 2 ×2 (1 charging)
    ['CON-SE-005-A', 'STN-SE-005', 'TYPE2-01', 'Type 2', 22, 'charging'],
    ['CON-SE-005-B', 'STN-SE-005', 'TYPE2-02', 'Type 2', 22, 'available'],
    // Djelfa — CCS2 ×4 (maintenance)
    ['CON-SE-006-A', 'STN-SE-006', 'CCS2-01', 'CCS2', 240, 'maintenance'],
    ['CON-SE-006-B', 'STN-SE-006', 'CCS2-02', 'CCS2', 240, 'maintenance'],
    ['CON-SE-006-C', 'STN-SE-006', 'CCS2-03', 'CCS2', 240, 'available'],
    ['CON-SE-006-D', 'STN-SE-006', 'CCS2-04', 'CCS2', 240, 'available'],
];
const sessions = [
    ['SES-DEMO-001', 'sonelgaz', 'STN-SG-001', 'CON-SG-001-A', 'APP-001', 'RFID-7894523', 'rfid_card', minutesAgo(38), null, 38, 31.4, 1099, 'active'],
    ['SES-DEMO-002', 'sonelgaz', 'STN-SG-002', 'CON-SG-002-A', 'APP-002', 'RFID-9876543', 'cib', daysAgo(0, 8, 15), daysAgo(0, 9, 5), 50, 42.8, 1369.6, 'completed'],
    ['SES-DEMO-003', 'sonelgaz', 'STN-SG-003', 'CON-SG-003-A', 'APP-003', 'RFID-4561237', 'epayment', daysAgo(1, 17, 20), daysAgo(1, 18, 35), 75, 58.6, 1816.6, 'completed'],
    ['SES-DEMO-004', 'sonelgaz', 'STN-SG-001', 'CON-SG-001-B', null, 'RFID-GUEST-102', 'rfid_card', daysAgo(2, 11, 5), daysAgo(2, 12, 10), 65, 19.4, 679, 'completed'],
    ['SES-DEMO-005', 'sonelgaz', 'STN-SG-004', 'CON-SG-004-A', 'APP-004', 'RFID-1239874', 'cib', daysAgo(3, 14, 30), daysAgo(3, 14, 48), 18, 0.9, 30.6, 'error'],
    ['SES-DEMO-006', 'saeig', 'STN-SE-001', 'CON-SE-001-A', 'APP-004', 'RFID-1239874', 'cib', minutesAgo(54), null, 54, 47.2, 1793.6, 'active'],
    ['SES-DEMO-007', 'saeig', 'STN-SE-001', 'CON-SE-001-B', 'APP-001', 'RFID-7894523', 'epayment', daysAgo(0, 10, 10), daysAgo(0, 11, 18), 68, 64.5, 2451, 'completed'],
    ['SES-DEMO-008', 'saeig', 'STN-SE-002', 'CON-SE-002-A', 'APP-002', 'RFID-9876543', 'rfid_card', daysAgo(1, 9, 40), daysAgo(1, 10, 2), 22, 7.8, 312, 'stopped'],
    ['SES-DEMO-009', 'saeig', 'STN-SE-003', 'CON-SE-003-A', 'APP-003', 'RFID-4561237', 'rfid_card', daysAgo(2, 15, 5), daysAgo(2, 16, 30), 85, 49.6, 1686.4, 'completed'],
    ['SES-DEMO-010', 'saeig', 'STN-SE-004', 'CON-SE-004-A', null, 'RFID-GUEST-221', 'epayment', daysAgo(4, 18, 10), daysAgo(4, 19, 5), 55, 15.2, 486.4, 'completed'],
];
const billing = [
    ['BILL-SG-001', 'sonelgaz', 'STN-SG-001', 'INV-2026-SG-001', 18, 846.5, 29627.5, 'paid', 'rfid_card', 2.1, false, daysAgo(1, 23, 0)],
    ['BILL-SG-002', 'sonelgaz', 'STN-SG-002', 'INV-2026-SG-002', 24, 1094.2, 35014.4, 'paid', 'cib', 6.4, false, daysAgo(2, 23, 0)],
    ['BILL-SG-003', 'sonelgaz', 'STN-SG-003', 'INV-2026-SG-003', 15, 512.8, 15896.8, 'unpaid', 'epayment', 3.2, false, daysAgo(3, 23, 0)],
    ['BILL-SG-004', 'sonelgaz', 'STN-SG-004', 'REFUND-2026-SG-001', 2, 31.4, -1099.0, 'refund', 'cib', 8.5, true, daysAgo(4, 23, 0)],
    ['BILL-SE-001', 'saeig', 'STN-SE-001', 'INV-2026-SE-001', 27, 1328.6, 50486.8, 'paid', 'cib', 5.7, false, daysAgo(1, 23, 5)],
    ['BILL-SE-002', 'saeig', 'STN-SE-002', 'INV-2026-SE-002', 11, 288.4, 11536.0, 'unpaid', 'rfid_card', 2.4, true, daysAgo(2, 23, 5)],
    ['BILL-SE-003', 'saeig', 'STN-SE-003', 'INV-2026-SE-003', 16, 624.7, 21239.8, 'paid', 'rfid_card', 1.9, false, daysAgo(3, 23, 5)],
    ['BILL-SE-004', 'saeig', 'STN-SE-004', 'INV-2026-SE-004', 13, 318.9, 10204.8, 'paid', 'epayment', 3.7, false, daysAgo(4, 23, 5)],
];
const tickets = [
    ['TKT-DEMO-001', 'sonelgaz', 'STN-SG-004', 'USR-003', 'Screen not responding', 'Touch screen intermittently freezes during payment step.', 'screen_issue', 'medium', 'in_progress', daysAgo(-1, 16, 0)],
    ['TKT-DEMO-002', 'sonelgaz', 'STN-SG-001', 'USR-003', 'Connector latch inspection', 'CCS2 connector latch reported as stiff after repeated sessions.', 'maintenance', 'low', 'open', daysAgo(2, 16, 0)],
    ['TKT-DEMO-003', 'saeig', 'STN-SE-002', 'USR-005', 'Voltage anomaly detected', 'Station reported voltage irregularities and connector fault state.', 'power_failure', 'critical', 'escalated', daysAgo(0, 18, 0)],
    ['TKT-DEMO-004', 'saeig', 'STN-SE-001', 'USR-005', 'Network latency on payment terminal', 'Payment authorization latency above normal threshold.', 'network_issue', 'high', 'open', daysAgo(1, 18, 0)],
];
const alerts = [
    ['ALT-DEMO-001', 'sonelgaz', 'STN-SG-004', 'TKT-DEMO-001', 'warning', 'Constantine Plaza is in maintenance; technician follow-up required.', false, minutesAgo(120)],
    ['ALT-DEMO-002', 'sonelgaz', 'STN-SG-001', null, 'info', 'Alger Centre Station has one active fast charging session.', false, minutesAgo(35)],
    ['ALT-DEMO-003', 'saeig', 'STN-SE-002', 'TKT-DEMO-003', 'error', 'Critical voltage anomaly detected at Blida Industrial Zone.', false, minutesAgo(25)],
    ['ALT-DEMO-004', 'saeig', 'STN-SE-001', 'TKT-DEMO-004', 'warning', 'Payment terminal latency increased at Annaba Port Station.', true, daysAgo(1, 12, 0)],
];
async function seedAppUsers() {
    const hash = await bcryptjs_1.default.hash('User@1234', 12);
    for (const [id, email, fullName, phone, rfid] of appUsers) {
        await db_1.default.query(`INSERT INTO app_users (app_user_id, email, password_hash, full_name, phone, rfid_card_number)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         phone = VALUES(phone),
         rfid_card_number = VALUES(rfid_card_number),
         status = 'active'`, [id, email, hash, fullName, phone, rfid]);
    }
}
async function seedStations() {
    for (const station of stations) {
        await db_1.default.query(`INSERT INTO stations
        (station_id, tenant_id, name, city, address, status, latitude, longitude, current_tariff_dzd_per_kwh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         name = VALUES(name),
         city = VALUES(city),
         address = VALUES(address),
         status = VALUES(status),
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         current_tariff_dzd_per_kwh = VALUES(current_tariff_dzd_per_kwh)`, station);
    }
}
async function seedConnectors() {
    for (const connector of connectors) {
        await db_1.default.query(`INSERT INTO connectors
        (connector_id, station_id, connector_code, connector_type, max_power_kw, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         station_id = VALUES(station_id),
         connector_code = VALUES(connector_code),
         connector_type = VALUES(connector_type),
         max_power_kw = VALUES(max_power_kw),
         status = VALUES(status)`, connector);
    }
}
async function seedSessions() {
    for (const session of sessions) {
        await db_1.default.query(`INSERT INTO charging_sessions
        (session_id, tenant_id, station_id, connector_id, app_user_id, user_identifier,
         payment_method, start_time, end_time, duration_min, energy_kwh, cost_dzd, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         station_id = VALUES(station_id),
         connector_id = VALUES(connector_id),
         app_user_id = VALUES(app_user_id),
         user_identifier = VALUES(user_identifier),
         payment_method = VALUES(payment_method),
         start_time = VALUES(start_time),
         end_time = VALUES(end_time),
         duration_min = VALUES(duration_min),
         energy_kwh = VALUES(energy_kwh),
         cost_dzd = VALUES(cost_dzd),
         status = VALUES(status)`, session);
    }
}
async function seedBilling() {
    for (const record of billing) {
        await db_1.default.query(`INSERT INTO billing_records
        (billing_id, tenant_id, station_id, invoice_number, sessions_count, energy_kwh,
         amount_dzd, status, payment_method, processing_time_sec, failed, billed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         station_id = VALUES(station_id),
         sessions_count = VALUES(sessions_count),
         energy_kwh = VALUES(energy_kwh),
         amount_dzd = VALUES(amount_dzd),
         status = VALUES(status),
         payment_method = VALUES(payment_method),
         processing_time_sec = VALUES(processing_time_sec),
         failed = VALUES(failed),
         billed_at = VALUES(billed_at)`, record);
    }
}
async function seedTickets() {
    for (const ticket of tickets) {
        await db_1.default.query(`INSERT INTO tickets
        (ticket_id, tenant_id, station_id, assigned_to_user_id, title, description,
         category, priority, status, sla_deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         station_id = VALUES(station_id),
         assigned_to_user_id = VALUES(assigned_to_user_id),
         title = VALUES(title),
         description = VALUES(description),
         category = VALUES(category),
         priority = VALUES(priority),
         status = VALUES(status),
         sla_deadline = VALUES(sla_deadline)`, ticket);
    }
}
async function seedAlerts() {
    for (const alert of alerts) {
        await db_1.default.query(`INSERT INTO alerts
        (alert_id, tenant_id, station_id, ticket_id, severity, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         station_id = VALUES(station_id),
         ticket_id = VALUES(ticket_id),
         severity = VALUES(severity),
         message = VALUES(message),
         is_read = VALUES(is_read),
         created_at = VALUES(created_at)`, alert);
    }
}
async function printSummary() {
    const [rows] = await db_1.default.query(`
    SELECT
      t.tenant_id,
      t.name,
      COUNT(DISTINCT s.station_id) AS stations,
      COUNT(DISTINCT c.connector_id) AS connectors,
      COUNT(DISTINCT cs.session_id) AS sessions,
      COALESCE(SUM(CASE WHEN cs.status = 'completed' THEN cs.energy_kwh END), 0) AS completed_energy_kwh,
      COALESCE(SUM(CASE WHEN cs.status = 'completed' THEN cs.cost_dzd END), 0) AS session_revenue_dzd,
      COUNT(DISTINCT tk.ticket_id) AS tickets,
      COUNT(DISTINCT a.alert_id) AS alerts
    FROM tenants t
    LEFT JOIN stations s ON s.tenant_id = t.tenant_id
    LEFT JOIN connectors c ON c.station_id = s.station_id
    LEFT JOIN charging_sessions cs ON cs.tenant_id = t.tenant_id
    LEFT JOIN tickets tk ON tk.tenant_id = t.tenant_id
    LEFT JOIN alerts a ON a.tenant_id = t.tenant_id
    GROUP BY t.tenant_id, t.name
    ORDER BY t.tenant_id
  `);
    console.table(rows);
}
async function main() {
    await seedAppUsers();
    await seedStations();
    await seedConnectors();
    await seedSessions();
    await seedBilling();
    await seedTickets();
    await seedAlerts();
    await printSummary();
    await db_1.default.end();
}
main().catch(async (err) => {
    console.error(err);
    await db_1.default.end();
    process.exit(1);
});
