# Documento Tecnico (MVP)

Estado: `MVP 1.1-alpha`

## 1. Objetivo tecnico
Construir una plataforma SaaS modular para profesionales independientes con arquitectura multi-tenant y base escalable.

## 2. Stack actual
- Backend: Django 6 + DRF + SimpleJWT.
- Frontend: Next.js 15.
- DB local: SQLite (desarrollo rapido).
- DB contenedorizada: PostgreSQL 16.
- Orquestacion local: Docker Compose.

## 3. Dominios implementados
### 3.1 Accounts
- `User` custom.
- Registro por API.
- Token JWT.

### 3.2 Core/Tenancy
- `Tenant`.
- `TenantMembership` (`owner/admin/staff`).
- Validacion de acceso por tenant en runtime.

### 3.3 Marketplace
- `Service` por tenant.

### 3.4 CRM
- `Client` por tenant.

### 3.5 Booking
- `Appointment` por tenant.
- Accion `cancel` en endpoint de turno.

### 3.6 Waitlist
- `Waitlist`, `WaitlistEntry`, `WaitlistOffer`.
- Endpoint `offer-from-cancel` para generar oferta de reasignacion (MVP sin worker).

### 3.7 Notifications
- `MessageTemplate`.
- `MessageQueue`.

### 3.8 POS
- `Product`, `Order`, `OrderItem`, `Payment`, `CashMovement`.
- `orders/{id}/mark-paid`.
- Creacion de `CashMovement` automatico al registrar `Payment`.

## 4. Contrato API actual
- Health: `GET /api/health/`
- Auth:
  - `POST /api/auth/register/`
  - `POST /api/auth/token/`
  - `POST /api/auth/token/refresh/`
- Core:
  - `GET/POST /api/tenants/`
  - `GET/POST /api/memberships/`
- Negocio (requiere `X-Tenant-ID`):
  - `GET/POST /api/services/`
  - `GET/POST /api/clients/`
  - `GET/POST /api/appointments/`
  - `POST /api/appointments/{id}/cancel/`
  - `GET/POST /api/waitlists/`
  - `GET/POST /api/waitlist-entries/`
  - `GET/POST /api/waitlist-offers/`
  - `POST /api/waitlist-offers/offer-from-cancel/`
  - `GET/POST /api/message-templates/`
  - `GET/POST /api/message-queue/`
  - `GET/POST /api/products/`
  - `GET/POST /api/orders/`
  - `POST /api/orders/{id}/mark-paid/`
  - `GET/POST /api/order-items/`
  - `GET/POST /api/payments/`
  - `GET/POST /api/cash-movements/`

## 5. Seguridad base
- JWT para autenticacion.
- Permiso default: usuario autenticado.
- Aislamiento por tenant validando membership activa.

## 6. Limitaciones actuales
- Waitlist sin proceso asyncrono de expiracion.
- Message queue sin worker de envio real.
- POS sin facturacion fiscal.

## 7. Hitos tecnicos siguientes
1. Worker para expiracion/confirmacion de ofertas de waitlist.
2. Integracion WhatsApp (envio real) sobre `MessageQueue`.
3. Facturacion y comprobantes PDF.
4. Analytics inicial y tests de integracion.
