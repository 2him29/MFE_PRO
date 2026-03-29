# EV Charge DZ - Admin Dashboard

A professional admin platform for managing EV charging operations in Algeria with multi-tenant support.

## Overview

This is an MVP (v1) desktop-first admin dashboard built for EV charging station operations management in Algeria. The platform supports multi-company tenancy with two operators: **Sonelgaz** (green accent) and **SAEIG** (blue accent).

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **React Router** - Navigation and routing
- **Tailwind CSS v4** - Styling
- **Recharts** - Data visualization
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **Sonner** - Toast notifications

## Features

### 1. Authentication & Tenant Selection
- Email/password login (demo mode)
- Company selector with Sonelgaz and SAEIG options
- Role-based access (Super Admin, Operator, Support)

### 2. Main Dashboard
- Real-time KPI cards with trends:
  - Active Stations
  - Active Sessions
  - Energy Consumption (kWh)
  - Revenue (DZD)
  - Faults
- Interactive charts (energy consumption, revenue trends)
- Recent alerts panel with severity indicators
- Date filters (Today / 7 Days / 30 Days)

### 3. Stations Management
- Table view with comprehensive station data
- Map view placeholder for geographic visualization
- Advanced filtering:
  - Status (Available, Charging, Fault, Offline, Maintenance)
  - City
  - Search by name/location
- Quick actions:
  - Enable/Disable station
  - Maintenance mode
  - Edit tariff
- Status chips with color coding

### 4. Session Monitoring
- Live and historical charging sessions
- Session details:
  - Station and connector
  - User/RFID identifier
  - Start time and duration
  - Energy consumption (kWh)
  - Cost (DZD)
  - Session status
- Actions:
  - Remote stop (with confirmation)
  - Flag anomaly
  - Export to CSV
- Summary statistics in footer

### 5. Tickets & Incidents
- Incident tracking with priority levels
- Status workflow: Open → In Progress → Resolved/Escalated
- SLA deadline tracking with color indicators
- Ticket assignment to team members
- Side drawer with:
  - Full ticket details
  - Activity timeline
  - Quick actions
- Filtering by status and priority

### 6. Billing & Reports
- Revenue summary cards:
  - Total revenue
  - Paid invoices
  - Unpaid invoices
  - Refunds
- Detailed invoice table with:
  - Invoice number
  - Station name
  - Sessions count
  - Energy consumption
  - Amount and payment status
- Reconciliation panel with:
  - Collection rate
  - Outstanding amount
  - Refund rate
- Export options (PDF/CSV)

## Design System

### Multi-Tenant Theming

**Sonelgaz (National Energy Provider)**
- Accent Color: `#16a34a` (Green)
- Logo: ⚡
- Coverage: 34 stations, 16 cities

**SAEIG (Industrial Services)**
- Accent Color: `#2563eb` (Blue)
- Logo: 🔌
- Coverage: 22 stations, 12 cities

### Color Palette

**Status Colors:**
- Available: Green (`#10b981`)
- Charging: Blue (`#3b82f6`)
- Fault/Error: Red (`#ef4444`)
- Offline: Gray (`#6b7280`)
- Maintenance: Orange (`#f97316`)

**Priority Colors:**
- Low: Slate
- Medium: Yellow
- High: Orange
- Critical: Red

### Components

**Reusable Dashboard Components:**
- `KPICard` - Metric display with trend indicators
- `StatusChip` - Status badges with color variants
- `FilterBar` - Search and filter controls
- `ConfirmModal` - Action confirmation dialogs
- `SideDrawer` - Contextual detail panels
- `ActivityLog` - Timeline of actions/events

**Layout Components:**
- `Sidebar` - Fixed left navigation
- `Header` - Top bar with company switcher, notifications, profile
- `DashboardLayout` - Main layout wrapper

## Data Structure

### Key Types
- `Tenant` - Company/operator information
- `Station` - Charging station details
- `Session` - Charging session data
- `Ticket` - Incident/support ticket
- `BillingRecord` - Invoice and payment data
- `KPIData` - Dashboard metrics

## Security & UX Features

### Tenant Context Awareness
- Always-visible company badge in header
- Tenant-specific accent colors throughout UI
- Data filtering by tenant context
- Company switcher with visual distinction

### Action Safety
- Confirmation modals for destructive actions
- Audit log for sensitive operations
- Role-based action availability
- Toast notifications for feedback

### Empty States
- Informative messages when no data
- Helpful guidance for next steps

### Loading & Error States
- Skeleton loaders (where applicable)
- Error boundaries for fault tolerance
- Graceful degradation

## Responsive Design

- **Desktop-first**: Optimized for 1440px width
- **Tablet support**: Responsive down to 768px
- **Layout flexibility**: Ready for RTL (Arabic) support
- **Flexible grids**: Adapts to various screen sizes

## Mock Data

Comprehensive mock data representing realistic Algerian EV charging operations:
- 8 charging stations across major cities (Alger, Oran, Constantine, Annaba, etc.)
- Active and completed charging sessions
- Open, in-progress, and resolved tickets
- Billing records with various payment states
- KPI data for different time periods

## Future Enhancements (Post-MVP)

1. **Internationalization**: French and Arabic language support
2. **Real-time Updates**: WebSocket integration for live data
3. **Advanced Analytics**: Predictive maintenance, demand forecasting
4. **Map Integration**: Interactive station maps with real locations
5. **Mobile App**: Companion mobile dashboard
6. **API Integration**: Backend connectivity
7. **User Management**: Admin user CRUD operations
8. **Advanced Reporting**: Custom report builder
9. **Notifications Center**: Comprehensive alert management
10. **Audit Trail**: Complete action history and compliance logging

## Development

### File Structure
```
src/app/
├── components/
│   ├── dashboard/     # Reusable dashboard components
│   ├── layout/        # Layout components
│   └── ui/            # Base UI components
├── contexts/          # React contexts (TenantContext)
├── data/              # Mock data
├── pages/             # Route pages
├── types/             # TypeScript type definitions
├── routes.ts          # Routing configuration
└── App.tsx            # Root component
```

### Key Decisions

- **Desktop-first**: Admin users primarily work from desktop workstations
- **Mock data**: Enables rapid prototyping and demo without backend
- **Tenant context**: Prevents cross-tenant data leaks and admin mistakes
- **Component reusability**: DRY principle for maintainability
- **Type safety**: TypeScript for reduced runtime errors
- **Accessible**: Radix UI primitives ensure WCAG compliance

## Notes

- Demo login accepts any email/password combination
- All actions show toast notifications (no actual state changes in MVP)
- Map view is a placeholder for future integration
- Data is filtered by selected tenant context
- Currency is in DZD (Algerian Dinar)
- Power ratings in kW (kilowatts)
