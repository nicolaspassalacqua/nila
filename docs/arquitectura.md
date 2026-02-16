# Arquitectura NILA

Estado: `MVP 1.1-alpha`

## 1. Arquitectura de alto nivel
- Frontend: Next.js.
- Backend: Django + DRF + JWT.
- DB: PostgreSQL (Docker) / SQLite (local rapido).

## 2. Patron
Monolito modular multi-tenant por `tenant`.

## 3. Modulos
- `accounts`
- `core`
- `marketplace`
- `crm`
- `booking`
- `waitlist`
- `notifications`
- `pos`

## 4. Aislamiento de datos
- Header `X-Tenant-ID` en endpoints de negocio.
- Validacion de membership activa en `core/tenant_access.py`.

## 5. Flujos clave MVP
1. Reserva y cancelacion de turnos.
2. Offer de waitlist desde cancelacion.
3. Registro de pagos y caja por POS.
4. Encolado base de notificaciones.

## 6. Infra local
`docker compose up --build` levanta:
- `frontend`
- `backend`
- `db`

## 7. Evolucion inmediata
- Worker asyncrono para waitlist y message queue.
- Integracion WhatsApp real.
- Facturacion avanzada.
- Tests integracion API.
