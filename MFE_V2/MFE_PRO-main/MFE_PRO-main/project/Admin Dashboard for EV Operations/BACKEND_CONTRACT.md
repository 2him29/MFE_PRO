# Backend Contract (Draft)

This draft aligns the frontend mock data with a backend-ready API for the Super Admin workflow.

## Core Models
- Tenant: `id`, `name`
- User: `id`, `email`, `name`, `role`, `tenantId`, `status`
- Station: `id`, `name`, `city`, `address`, `connectorType`, `power`, `status`, `tenantId`,
  `latitude`, `longitude`, `activeConnectors`, `totalConnectors`, `currentTariff`
- Ticket/Task: `id`, `title`, `description`, `category`, `priority`, `status`, `tenantId`,
  `assignedToId`, `createdById`, `createdAt`, `updatedAt`, `slaDeadline`
- TicketActivity: `id`, `ticketId`, `userId`, `action`, `details`, `createdAt`

## Roles & Permissions
- `super_admin`: create users/tenants/stations, assign tasks across tenants, full visibility
- `tenant_admin`: manage users/tasks/stations inside their tenant
- `technician`: view only assigned tasks, can update status/report

## Suggested Endpoints
### Auth
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Tenants
- `GET /tenants`
- `POST /tenants` (super_admin)

### Users
- `GET /users?tenantId=`
- `POST /users` (super_admin / tenant_admin)
- `PATCH /users/:id` (role/status updates)

### Stations
- `GET /stations?tenantId=` (super_admin / tenant_admin)
- `POST /stations` (super_admin / tenant_admin — body: name, city, address, connectorType, power, latitude, longitude, totalConnectors, currentTariff, tenantId)
- `PATCH /stations/:id` (status, tariff, maintenance mode)
- `DELETE /stations/:id` (super_admin only)

### Tickets / Tasks
- `GET /tickets?tenantId=&status=&assignedToId=`
- `POST /tickets` (create + assign)
- `PATCH /tickets/:id` (status updates, reassignment)
- `POST /tickets/:id/activity` (technician report)

### Activity
- `GET /tickets/:id/activity`

## Notes
- Use JWT or session-based auth with role claims.
- Enforce tenant scoping on every query.
- Technician write scope limited to assigned tasks.
