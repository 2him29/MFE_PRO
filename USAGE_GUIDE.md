# EV Charge DZ - Usage Guide

## Getting Started

### 1. Login
- Navigate to the root URL (`/`)
- Enter any email and password (demo mode)
- Click "Sign In"

### 2. Select Company
After login, you'll see two company options:

**Sonelgaz** (Green Theme)
- National Energy Provider
- 34 active stations
- 16 cities coverage

**SAEIG** (Blue Theme)
- Industrial Services
- 22 active stations
- 12 cities coverage

Select a company to proceed to the dashboard.

## Navigation

The application has role-based sections accessible from the left sidebar:

### 📊 Dashboard
**Purpose**: Real-time operational overview

**Features**:
- KPI cards showing key metrics with trend indicators
- Energy consumption chart (24-hour view)
- Revenue trend chart (7-day view)
- Recent alerts panel with severity levels
- Date filters: Today / 7 Days / 30 Days

**Use Cases**:
- Morning briefing check
- Quick operational status assessment
- Identifying trends and anomalies

---

### ⚡ Stations
**Purpose**: Manage charging station fleet

**Features**:
- **Table View**: Comprehensive station list with:
  - Station name and location
  - Status (Available, Charging, Fault, Offline, Maintenance)
  - Connector information
  - Power rating and tariff
  - Quick action menu
- **Map View**: Interactive geographic visualization with station markers
- **Filters**: Status, City, Search
- **Actions**: Enable/Disable, Maintenance Mode, Edit Tariff

**Use Cases**:
- Monitor station health
- Respond to faults
- Manage maintenance schedules
- Update pricing

**Action Confirmations**:
- Disable station → Destructive confirmation required
- Other actions → Standard confirmation

---

### 🔌 Sessions
**Purpose**: Monitor charging sessions

**Features**:
- Live and historical session tracking
- Session details: Station, Connector, User/RFID, Duration, Energy, Cost
- Status indicators: Active, Completed, Stopped, Error
- **Actions**:
  - Remote Stop (for active sessions)
  - Flag Anomaly
  - Export to CSV
- Summary statistics footer

**Use Cases**:
- Monitor active charging
- Handle session issues
- Generate usage reports
- Investigate anomalies

**Data Display**:
- Duration shown as "2h 45m" format
- Energy in kWh (kilowatt-hours)
- Cost in DZD (Algerian Dinar)

---

### 🎫 Tickets
**Purpose**: Track and resolve incidents

**Features**:
- Incident list with priority and status
- **Priority Levels**: Low, Medium, High, Critical
- **Status Flow**: Open → In Progress → Resolved/Escalated
- **SLA Tracking**: Color-coded deadline indicators
  - Green: >4 hours remaining
  - Orange: 2-4 hours remaining
  - Red: <2 hours remaining
- **Side Drawer**: Detailed ticket view with:
  - Full description
  - Station information
  - Assignment details
  - Activity timeline
  - Quick action buttons

**Use Cases**:
- Respond to station faults
- Track maintenance work
- Ensure SLA compliance
- Team workload distribution

**Filters**:
- Status (Open, In Progress, Resolved, Escalated)
- Priority (Low, Medium, High, Critical)
- Search by title or station

---

### 💰 Billing
**Purpose**: Revenue tracking and invoice management

**Features**:
- **Summary Cards**:
  - Total Revenue
  - Paid Invoices (green)
  - Unpaid Invoices (yellow)
  - Refunds (orange)
- **Invoice Table**: Detailed billing records
- **Reconciliation Panel**: Collection metrics
- **Export Options**: PDF and CSV

**Payment States**:
- **Paid**: Invoice settled (green badge)
- **Unpaid**: Payment pending (yellow badge)
- **Refund**: Amount refunded (orange badge, negative amount)

**Use Cases**:
- Monthly revenue reporting
- Track outstanding payments
- Financial reconciliation
- Generate invoices

---

## Key Features

### Multi-Tenant Context
- **Always Visible**: Company badge in top header
- **Accent Colors**: UI elements reflect company theme
  - Sonelgaz: Green accents
  - SAEIG: Blue accents
- **Data Isolation**: Each view filters data by selected company
- **Easy Switching**: Company switcher in header

### Action Safety
All destructive actions require confirmation:
- Disabling stations
- Remote stopping sessions
- Critical operations

Toast notifications provide immediate feedback for all actions.

### Search & Filtering
Every data table includes:
- **Search bar**: Free-text search
- **Status filters**: Filter by operational state
- **Additional filters**: Context-specific options

### Responsive Design
- Optimized for desktop (1440px)
- Adapts to tablet screens
- Mobile-friendly tables with horizontal scroll

### Keyboard Navigation
- Tab through interactive elements
- Enter to confirm selections
- Escape to close modals/drawers

---

## Understanding Status Indicators

### Station Status Colors
| Status | Color | Meaning |
|--------|-------|---------|
| Available | Green | Ready for charging |
| Charging | Blue | Currently in use |
| Fault | Red | Hardware/software issue |
| Offline | Gray | No connectivity |
| Maintenance | Orange | Under maintenance |

### Session Status
- **Active** (Blue): Charging in progress
- **Completed** (Green): Successfully finished
- **Stopped** (Gray): Manually terminated
- **Error** (Red): Failed or interrupted

### Ticket Priority
- **Low** (Gray): Non-urgent, routine tasks
- **Medium** (Yellow): Standard priority
- **High** (Orange): Requires prompt attention
- **Critical** (Red): Immediate action required

---

## Common Workflows

### 1. Morning Operations Check
1. Login and select company
2. View Dashboard KPIs
3. Check Recent Alerts panel
4. Review any Critical tickets
5. Monitor active sessions count

### 2. Responding to Station Fault
1. Receive alert on Dashboard
2. Navigate to Tickets
3. Open ticket for affected station
4. Review activity timeline
5. Assign to technician
6. Update status to "In Progress"
7. Monitor resolution

### 3. Monthly Billing Review
1. Navigate to Billing
2. Review Summary Cards
3. Filter for "Unpaid" invoices
4. Export detailed report (CSV/PDF)
5. Check Reconciliation Panel
6. Follow up on outstanding payments

### 4. Fleet Status Review
1. Navigate to Stations
2. Filter by Status = "Fault"
3. Review affected stations
4. Cross-reference with Tickets
5. Plan maintenance schedule
6. Update station to "Maintenance" mode

---

## Tips & Best Practices

### Performance
- Use date filters on Dashboard for faster loading
- Export large datasets rather than scrolling
- Close drawers/modals when done

### Data Accuracy
- Always verify company context (top header badge)
- Double-check station names before actions
- Review confirmation modals carefully

### Reporting
- Export data regularly for backup
- Use consistent date ranges for trend analysis
- Cross-reference Sessions with Billing data

### Incident Management
- Assign tickets immediately for accountability
- Add comments for communication
- Update status promptly
- Monitor SLA deadlines (color indicators)

---

## Environment Indicator

The **PRODUCTION** badge in the header indicates the current environment. In a real deployment, this would show:
- **PRODUCTION** (Green)
- **STAGING** (Yellow)
- **DEVELOPMENT** (Blue)

---

## Support & Feedback

For technical issues or feature requests, contact your system administrator or refer to the PROJECT_DOCUMENTATION.md file for detailed technical information.

---

## Demo Notes

This is an MVP with mock data:
- Most operational actions show notifications but don't persist yet
- Login accepts any credentials
- Stations map is fully interactive (Leaflet + OpenStreetMap)
- User accounts and active session context persist in browser localStorage
- All dates and times are simulated

For production deployment, integrate with:
- Real authentication backend
- Live charging station APIs
- Payment processing system
- Geographic mapping service
- Real-time WebSocket updates
