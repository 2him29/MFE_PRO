# MFE_PRO

Repository for the EV Charge DZ Admin Dashboard (development versions).

## Overview

A professional, production-ready admin platform for managing EV charging operations in Algeria.

## Features

- Multi-tenant support: Sonelgaz (green) and SAEIG (blue) with distinct branding
- 6 core modules: Dashboard, Stations, Sessions, Tickets, Billing
- Real-time monitoring: Live KPIs, charts, and alert panels
- Advanced filtering: Search and filter across all data tables
- Action confirmations: Safety checks for destructive operations
- Responsive design: Desktop-first, tablet-ready (1440px to 768px)
- Professional UI: Built with Radix UI, Tailwind CSS v4, and Recharts

## Quick Start

1. Login: Use any email/password (demo mode)
2. Select company: Choose Sonelgaz or SAEIG
3. Navigate: Use the sidebar to access different modules
4. Interact: All actions show toast notifications

## Tech Stack

- React 18 + TypeScript
- React Router 7 (Data mode)
- Tailwind CSS v4
- Radix UI Components
- Recharts (Data Visualization)
- date-fns (Date formatting)
- Sonner (Notifications)

## Project Structure

```
src/app/
├── components/
│   ├── dashboard/      # KPICard, StatusChip, FilterBar, etc.
│   ├── layout/         # Sidebar, Header, DashboardLayout
│   └── ui/             # Base Radix UI components
├── contexts/           # TenantContext for multi-tenant state
├── data/               # Mock data for demo
├── pages/              # 6 main routes + Login + NotFound
├── types/              # TypeScript definitions
├── routes.ts           # React Router configuration
└── App.tsx             # Root component
```

## Design System

### Colors
- Sonelgaz: Green (#16a34a) - National Energy Provider
- SAEIG: Blue (#2563eb) - Industrial Services

### Status Palette
- Available: Green
- Charging: Blue
- Fault/Error: Red
- Offline: Gray
- Maintenance: Orange

### Components
- KPI Cards with trend indicators
- Status chips with color variants
- Data tables with inline actions
- Confirmation modals
- Side drawers for details
- Activity timeline

## Security Features

- Tenant context awareness: Company badge always visible
- Action confirmations: Destructive actions require confirmation
- Audit logging: Activity timeline for accountability
- Role-based UI: Super Admin, Operator, Support roles

## Key Screens

1. Login + Company Selector: Authentication and tenant selection
2. Dashboard: KPIs, charts, alerts (date filters: Today/7d/30d)
3. Stations: Table + Map views, status management, quick actions
4. Sessions: Live monitoring, remote stop, export capabilities
5. Tickets: SLA tracking, priority management, activity timeline
6. Billing: Revenue summary, invoice table, reconciliation panel

## Localization Ready

- Flexible layout for RTL (Arabic) support
- Design tokens for easy theming
- Internationalization hooks ready

## Documentation

- PROJECT_DOCUMENTATION.md: Technical architecture and decisions
- USAGE_GUIDE.md: User manual and workflows
- README.md: This file

## MVP Scope

This v1 includes:
- Multi-tenant architecture
- Real-time operational monitoring
- Station fleet management
- Session tracking
- Incident management
- Billing and reports
- Mock data for demo

## Future Enhancements

- French/Arabic i18n
- Real-time WebSocket updates
- Interactive map integration
- Backend API integration
- Mobile companion app
- Advanced analytics
- Custom report builder
- User management CRUD

## Notes

- Demo mode: Login accepts any credentials
- Mock data: All actions show notifications but do not persist
- Map view: Placeholder for future integration
- Currency: DZD (Algerian Dinar)
- Power units: kW (kilowatts)

## Screenshots

See the application running for a full visual tour of:
- Clean, modern operational dashboard
- Data-heavy but readable tables
- Professional multi-tenant theming
- Polished B2B SaaS aesthetic

---

Built for Figma Make | Desktop-first Admin Platform | v1.0.0 MVP