# EV Charge DZ - Editable UML Code

These diagrams are based on the current React/TypeScript project structure:

- Multi-tenant EV operations admin dashboard.
- Roles: `super_admin`, `tenant_admin`, `technician`.
- Main modules: Dashboard, Stations, Sessions, Tickets, Billing, Users, My Tasks.
- Demo persistence through `localStorage` stores for users, stations, tickets, notifications, and session context.
- Super Admin uses an extra OTP verification step.

## 1. Class Diagram

```plantuml
@startuml
title EV Charge DZ - Frontend Domain Class Diagram

hide circle
skinparam classAttributeIconSize 0

enum TenantId {
  sonelgaz
  saeig
}

enum UserRole {
  super_admin
  tenant_admin
  technician
}

enum UserStatus {
  active
  suspended
}

enum UserPrivilege {
  users_view
  users_manage
  stations_view
  stations_manage
  sessions_view
  sessions_control
  tickets_view
  tickets_manage
  billing_view
  billing_manage
  reports_view
  reports_export
  settings_manage
}

enum StationStatus {
  available
  charging
  offline
  fault
  maintenance
}

enum ConnectorType {
  CCS2
  CHAdeMO
  Type_2
}

enum SessionStatus {
  active
  completed
  stopped
  error
}

enum TicketPriority {
  low
  medium
  high
  critical
}

enum TicketStatus {
  open
  in_progress
  resolved
  escalated
}

enum TicketCategory {
  power_failure
  screen_issue
  charger_fault
  system_failure
  network_issue
  maintenance
}

enum PaymentStatus {
  paid
  unpaid
  refund
}

enum PaymentMethod {
  rfid_card
  cib
  epayment
}

enum AlertSeverity {
  info
  warning
  error
}

enum NotificationCategory {
  station_offline
  charger_fault
  session_failed
  payment_failed
  sla_breach
  ticket_escalated
  system_update
}

class Tenant {
  +id: TenantId
  +name: string
  +logo: string
  +logoImage?: string
  +accentColor: string
  +accentColorDark: string
}

class User {
  +id: string
  +email: string
  +name: string
  +role: UserRole
  +tenantId: TenantId
  +status?: UserStatus
  +privileges?: UserPrivilege[]
  +privilegeTemplate?: string
}

class Station {
  +id: string
  +name: string
  +city: string
  +address: string
  +connectorType: ConnectorType
  +power: number
  +status: StationStatus
  +tenantId: TenantId
  +latitude: number
  +longitude: number
  +activeConnectors: number
  +totalConnectors: number
  +currentTariff: number
}

class ConnectorConfig {
  +type: ConnectorType
  +count: number
  +powerKw: number
}

class Session {
  +id: string
  +stationName: string
  +connector: string
  +userIdentifier: string
  +startTime: Date
  +duration: number
  +energyKwh: number
  +cost: number
  +status: SessionStatus
  +tenantId: TenantId
}

class Ticket {
  +id: string
  +title: string
  +description: string
  +stationName: string
  +category: TicketCategory
  +priority: TicketPriority
  +status: TicketStatus
  +assignedTo: string | null
  +assignedToId?: string | null
  +createdById?: string
  +createdBy?: string
  +createdAt: Date
  +updatedAt: Date
  +tenantId: TenantId
  +slaDeadline: Date
}

class TicketActivity {
  +id: string
  +action: string
  +user: string
  +timestamp: Date
  +details: string
}

class BillingRecord {
  +id: string
  +invoiceNumber: string
  +stationName: string
  +sessions: number
  +energyKwh: number
  +amount: number
  +status: PaymentStatus
  +paymentMethod: PaymentMethod
  +processingTime?: number
  +failed?: boolean
  +date: Date
  +tenantId: TenantId
}

class Alert {
  +id: string
  +message: string
  +severity: AlertSeverity
  +timestamp: Date
  +stationName?: string
}

class AppNotification {
  +id: string
  +title: string
  +message: string
  +severity: AlertSeverity
  +category: NotificationCategory
  +createdAt: Date
  +tenantId: TenantId
  +route: string
  +entityId?: string
  +targetRoles?: UserRole[]
  +readBy: string[]
}

interface OtpService {
  +requestOtp(email: string): Promise<OtpRequestResult>
  +verifyOtp(email: string, code: string): Promise<OtpVerifyResult>
}

class MockOtpService {
  -store: Map<string, OtpEntry>
  +requestOtp(email: string): Promise<OtpRequestResult>
  +verifyOtp(email: string, code: string): Promise<OtpVerifyResult>
}

class OtpEntry {
  +code: string
  +expiresAt: number
  +attempts: number
}

class TenantContext {
  +currentTenant: Tenant | null
  +currentUser: User | null
  +pendingAuth: PendingAuth | null
  +setCurrentTenant(tenant)
  +setCurrentUser(user)
  +setPendingAuth(auth)
  +clearPendingAuth()
  +logout()
}

class LocalStorageStore {
  +loadUsers(): User[]
  +saveUsers(users)
  +loadStations(): Station[]
  +saveStations(stations)
  +loadTickets(): Ticket[]
  +saveTickets(tickets)
  +loadNotifications(): AppNotification[]
  +saveNotifications(notifications)
}

Tenant "1" -- "0..*" User
Tenant "1" -- "0..*" Station
Tenant "1" -- "0..*" Session
Tenant "1" -- "0..*" Ticket
Tenant "1" -- "0..*" BillingRecord
Tenant "1" -- "0..*" AppNotification

Station "1" *-- "1..*" ConnectorConfig
Station "1" -- "0..*" Session : stationName
Station "1" -- "0..*" Ticket : stationName
Station "1" -- "0..*" BillingRecord : stationName
Station "0..1" -- "0..*" Alert : stationName

User "0..1" -- "0..*" Ticket : createdById
User "0..1" -- "0..*" Ticket : assignedToId
User "0..*" -- "0..*" AppNotification : readBy

Ticket "1" -- "0..*" TicketActivity
MockOtpService ..|> OtpService
MockOtpService *-- "0..*" OtpEntry
TenantContext --> Tenant
TenantContext --> User
TenantContext --> MockOtpService : pending super admin flow
LocalStorageStore ..> User
LocalStorageStore ..> Station
LocalStorageStore ..> Ticket
LocalStorageStore ..> AppNotification

note bottom of Session
Current MVP stores stationName and connector text.
The backend contract can later replace these with station_id and connector_id.
end note

note bottom of LocalStorageStore
Demo persistence keys:
evcharge.session, evcharge.users,
evcharge.stations, evcharge.tickets,
evcharge.notifications.
end note

@enduml
```

## 2. Use Case Diagram

```plantuml
@startuml
title EV Charge DZ - Use Case Diagram
left to right direction

actor "Super Admin" as SuperAdmin
actor "Tenant Admin" as TenantAdmin
actor "Technician" as Technician

rectangle "EV Charge DZ Admin Dashboard" {
  usecase "Login" as UC_Login
  usecase "Verify OTP" as UC_OTP
  usecase "Select Tenant Context" as UC_Tenant
  usecase "View Dashboard\nKPIs, Charts, Alerts" as UC_Dashboard

  usecase "Manage Users\nCreate, Edit, Suspend,\nPrivileges" as UC_Users
  usecase "Manage Stations\nCreate, Edit, Status,\nTariff, Maintenance" as UC_Stations
  usecase "View Station Map" as UC_Map
  usecase "Monitor Sessions\nFilter, Remote Stop,\nFlag Anomaly, Export" as UC_Sessions
  usecase "Manage Tickets\nCreate, Assign,\nUpdate Status" as UC_Tickets
  usecase "Lookup Assignable Users" as UC_Assignees
  usecase "Update My Tasks\nStatus and Field Report" as UC_MyTasks
  usecase "View Billing and Reports\nRevenue, Invoices,\nReconciliation, Export" as UC_Billing
  usecase "View Notifications" as UC_Notifications
}

SuperAdmin --> UC_Login
SuperAdmin --> UC_OTP
SuperAdmin --> UC_Tenant
SuperAdmin --> UC_Dashboard
SuperAdmin --> UC_Users
SuperAdmin --> UC_Stations
SuperAdmin --> UC_Map
SuperAdmin --> UC_Sessions
SuperAdmin --> UC_Tickets
SuperAdmin --> UC_Billing
SuperAdmin --> UC_Notifications

TenantAdmin --> UC_Login
TenantAdmin --> UC_Tenant
TenantAdmin --> UC_Dashboard
TenantAdmin --> UC_Stations
TenantAdmin --> UC_Map
TenantAdmin --> UC_Sessions
TenantAdmin --> UC_Tickets
TenantAdmin --> UC_Billing
TenantAdmin --> UC_Notifications

Technician --> UC_Login
Technician --> UC_Dashboard
Technician --> UC_MyTasks
Technician --> UC_Notifications

UC_OTP .> UC_Login : <<extend>> super_admin only
UC_Tickets .> UC_Assignees : <<include>>
UC_Stations .> UC_Map : <<include>>
UC_MyTasks .> UC_Tickets : <<extend>>

@enduml
```

## 3. Sequence Diagram - Create and Assign Ticket

```plantuml
@startuml
title EV Charge DZ - Sequence Diagram: Create and Assign Ticket

actor "Tenant Admin / Super Admin" as Admin
boundary "Tickets Page\nTickets.tsx" as TicketsUI
control "TenantContext" as TenantCtx
control "User Store\nloadUsers()" as UserStore
control "Ticket Store\nloadTickets()/saveTickets()" as TicketStore
database "Browser localStorage" as LocalStorage
boundary "Toast Notification" as Toast
actor "Technician" as Technician
boundary "My Tasks Page\nMyTasks.tsx" as MyTasks

Admin -> TicketsUI: Open Create Ticket drawer
TicketsUI -> TenantCtx: Read currentUser and currentTenant
TenantCtx --> TicketsUI: user, tenant

TicketsUI -> UserStore: loadUsers()
UserStore -> LocalStorage: GET evcharge.users
LocalStorage --> UserStore: stored users or mockUsers
UserStore --> TicketsUI: users[]

TicketsUI -> TicketsUI: Filter assignable users\nby tenant, role, status
Admin -> TicketsUI: Submit ticket form
TicketsUI -> TicketsUI: Validate required fields
TicketsUI -> TicketsUI: Compute SLA deadline\nfrom priority
TicketsUI -> TicketStore: loadTickets()
TicketStore -> LocalStorage: GET evcharge.tickets
LocalStorage --> TicketStore: stored tickets or mockTickets
TicketStore --> TicketsUI: tickets[]

TicketsUI -> TicketsUI: Build Ticket object\nstatus = open
TicketsUI -> TicketStore: saveTickets(nextTickets)
TicketStore -> LocalStorage: SET evcharge.tickets
LocalStorage --> TicketStore: ok
TicketStore --> TicketsUI: persisted
TicketsUI -> Toast: Show success message

Technician -> MyTasks: Open My Tasks
MyTasks -> TenantCtx: Read currentUser
TenantCtx --> MyTasks: technician user
MyTasks -> TicketStore: loadTickets()
TicketStore -> LocalStorage: GET evcharge.tickets
LocalStorage --> TicketStore: persisted tickets
TicketStore --> MyTasks: assigned tickets
MyTasks -> Technician: Display assigned task

@enduml
```

## 4. Sequence Diagram - Super Admin Login With OTP

```plantuml
@startuml
title EV Charge DZ - Sequence Diagram: Super Admin Login With OTP

actor "Super Admin" as SuperAdmin
boundary "Login Page\nLogin.tsx" as LoginUI
control "User Store\nloadUsers()" as UserStore
control "TenantContext" as TenantCtx
control "Router" as Router
boundary "OTP Page\nOtpVerify.tsx" as OtpUI
control "OtpService\nMockOtpService" as OtpService
database "In-memory OTP Store" as OtpStore
database "Browser localStorage" as LocalStorage

SuperAdmin -> LoginUI: Enter email, password,\ncompany, access code
LoginUI -> UserStore: loadUsers()
UserStore --> LoginUI: matching user or demo user
LoginUI -> LoginUI: Validate super admin code\nEV-SUPER-2026
LoginUI -> TenantCtx: setPendingAuth(user, tenant)
LoginUI -> Router: navigate('/verify-otp')

OtpUI -> TenantCtx: read pendingAuth
TenantCtx --> OtpUI: pending user and tenant
OtpUI -> OtpService: requestOtp(email)
OtpService -> OtpStore: Save code, expiry,\nattempt count
OtpService --> OtpUI: demoCode
OtpUI -> SuperAdmin: Display demo OTP code

SuperAdmin -> OtpUI: Enter 6-digit code
OtpUI -> OtpService: verifyOtp(email, code)
OtpService -> OtpStore: Check expiry and attempts

alt valid code
  OtpService --> OtpUI: valid = true
  OtpUI -> TenantCtx: setCurrentTenant(tenant)
  OtpUI -> TenantCtx: setCurrentUser(user)
  OtpUI -> TenantCtx: clearPendingAuth()
  TenantCtx -> LocalStorage: SET evcharge.session
  OtpUI -> Router: navigate('/dashboard')
else invalid, expired, or locked
  OtpService --> OtpUI: valid = false, reason
  OtpUI -> SuperAdmin: Show error or lock state
end

@enduml
```

## 5. Activity Diagram - Ticket Lifecycle

```plantuml
@startuml
title EV Charge DZ - Activity Diagram: Ticket Lifecycle

start

:Issue detected\n(alert or manual report);
:Admin opens Tickets page;
:Open Create Ticket drawer;
:Fill title, station, category,\npriority, assignee, description;

if (Form valid?) then (yes)
  :Compute SLA deadline\nbased on priority;
  :Create ticket\nstatus = open;
  :Persist ticket to localStorage;
  :Show success toast;
else (no)
  :Show validation error;
  stop
endif

if (Assignee selected?) then (yes)
  :Store assignedTo and assignedToId;
  :Ticket appears in technician My Tasks;
else (no)
  :Keep ticket unassigned;
endif

:Technician opens My Tasks;

while (Ticket resolved?) is (no)
  :Update status\nopen, in_progress, escalated;
  :Submit field report;
  :Update ticket.updatedAt;
  :Persist ticket changes;
endwhile (yes)

:Set status = resolved;
:Persist resolved ticket;
:Dashboard and notifications reflect new state;

stop
@enduml
```

## 6. Activity Diagram - Create Station

```plantuml
@startuml
title EV Charge DZ - Activity Diagram: Create Station

start

:Admin navigates to Stations page;
:Click New Station;
:Side drawer opens with empty form;

if (Super Admin?) then (yes)
  :Select target tenant\nSonelgaz or SAEIG;
else (no)
  :Use current tenant context;
endif

:Fill station details\nname, city, address,\nconnectors, power, tariff,\nlatitude, longitude;

if (Form valid?) then (yes)
  :Generate station id\nSTN-{timestamp};
  :Set status = available;
  :Set activeConnectors = 0;
  :Append station to list;
  :Persist stations to localStorage;
  :Show success toast;
  :Close drawer and reset form;
else (no)
  :Show validation error;
  :Keep drawer open;
  stop
endif

:Station appears in table view;
:Station appears in map view;

stop
@enduml
```

## 7. Component/Architecture Diagram

```plantuml
@startuml
title EV Charge DZ - Frontend Architecture Component Diagram

skinparam componentStyle rectangle

actor "Admin / Technician" as User

package "React App" {
  [App.tsx] as App
  [React Router\nroutes.tsx] as Router
  [RequireAuth] as RequireAuth
  [TenantProvider\nTenantContext] as TenantProvider

  package "Pages" {
    [Login] as Login
    [OtpVerify] as OtpVerify
    [Dashboard] as Dashboard
    [Stations] as Stations
    [Sessions] as Sessions
    [Tickets] as Tickets
    [Billing] as Billing
    [Users] as UsersPage
    [MyTasks] as MyTasks
  }

  package "Layout" {
    [DashboardLayout] as DashboardLayout
    [Sidebar] as Sidebar
    [Header] as Header
  }

  package "Reusable Components" {
    [KPICard] as KPICard
    [StationMap] as StationMap
    [FilterBar] as FilterBar
    [SideDrawer] as SideDrawer
    [ConfirmModal] as ConfirmModal
    [StatusChip] as StatusChip
    [Charts] as Charts
    [Radix UI Components] as UI
  }

  package "Data and Services" {
    [mockData.ts] as MockData
    [userStore.ts] as UserStore
    [stationStore.ts] as StationStore
    [ticketStore.ts] as TicketStore
    [notificationStore.ts] as NotificationStore
    [otpService.ts] as OtpService
  }
}

database "Browser localStorage" as LocalStorage

User --> App
App --> TenantProvider
App --> Router
Router --> Login
Router --> OtpVerify
Router --> RequireAuth
RequireAuth --> DashboardLayout

DashboardLayout --> Sidebar
DashboardLayout --> Header
DashboardLayout --> Dashboard
DashboardLayout --> Stations
DashboardLayout --> Sessions
DashboardLayout --> Tickets
DashboardLayout --> Billing
DashboardLayout --> UsersPage
DashboardLayout --> MyTasks

Header --> TenantProvider
Header --> NotificationStore
Login --> UserStore
Login --> TenantProvider
OtpVerify --> OtpService
OtpVerify --> TenantProvider

Dashboard --> MockData
Dashboard --> KPICard
Dashboard --> Charts
Dashboard --> StatusChip

Stations --> StationStore
Stations --> StationMap
Stations --> FilterBar
Stations --> SideDrawer
Stations --> ConfirmModal

Sessions --> MockData
Sessions --> FilterBar
Sessions --> ConfirmModal

Tickets --> TicketStore
Tickets --> UserStore
Tickets --> SideDrawer
Tickets --> StatusChip

Billing --> MockData
Billing --> Charts
Billing --> FilterBar

UsersPage --> UserStore
MyTasks --> TicketStore

UserStore --> LocalStorage
StationStore --> LocalStorage
TicketStore --> LocalStorage
NotificationStore --> LocalStorage
TenantProvider --> LocalStorage

@enduml
```
