# Manual Tecnico - NILA
Version: `1.0`
Fecha: `2026-03-11`

## 1. Resumen tecnico
NILA es una aplicacion web full-stack con frontend React y backend Django REST sobre PostgreSQL.

Componentes runtime:
- `frontend` (Vite/React)
- `backend` (Django/DRF + JWT)
- `db` (PostgreSQL)

## 2. Backend

## 2.1 Configuracion global
Archivo: `backend/config/settings.py`
- Auth API: `JWTAuthentication`
- Permiso default: `IsAuthenticated`
- CORS habilitado globalmente
- DB por variables de entorno (`POSTGRES_*`)

## 2.2 Seguridad y autorizacion
Roles:
- admin (is_staff/is_superuser)
- owner
- instructor
- alumno

Reglas:
- Admin global gestiona plataforma y usuarios.
- Owner opera solo organizaciones vinculadas por `OrganizationMembership`.
- Instructor opera clases propias.
- Alumno consulta/perfila datos propios.

## 2.3 Modelo de datos (principal)
- `Organization`
- `Establishment`
- `Room`
- `OrganizationMembership`
- `Student`
- `StudentHistory`
- `StudioClass`
- `MembershipPlan`
- `Payment`
- `Invoice`
- `PlatformSetting`
- `UserProfile`

## 2.4 Endpoints API
Prefijo: `/api/`

Auth:
- `POST auth/token/`
- `POST auth/token/refresh/`
- `GET auth/me/`
- `GET auth/marketplace-organizations/` (publico)
- `POST auth/register-student/` (publico)
- `POST auth/sso/google/` (publico)
- `POST auth/sso/facebook/` (publico)

Core:
- `organizations/`
- `establishments/`
- `rooms/`

Classes:
- `classes/`
- `classes/{id}/assign-room/`
- `classes/{id}/assign-instructor/`
- `classes/{id}/cancel/`

Students:
- `students/`
- `students/my-profiles/`
- `students/join-organization/`
- `students/{id}/history/`
- `students/{id}/assign-establishments/`
- `students/{id}/add-history-note/`
- `students/{id}/set-level/`

Payments:
- `membership-plans/`
- `payments/`
- `payments/{id}/create-checkout/`
- `payments/mercadopago/webhook/`
- `payments/{id}/mark-paid/`
- `payments/{id}/emit-invoice/`
- `invoices/`

Admin:
- `users/`
- `users/roles/`
- `users/{id}/assign-role/`
- `users/{id}/reset-password/`
- `users/{id}/assign-owner-organization/`
- `users/{id}/deactivate-owner-organization/`
- `platform-settings/`

Dashboard:
- `dashboard/summary/`

Health:
- `GET /api/health/`

## 2.5 Integraciones
### MercadoPago (MVP)
- Se genera `external_reference` y `checkout_url` simulado.
- Webhook actualiza estado de pago.

### ARCA (MVP)
- Se emite comprobante simulado con CAE y vencimiento.
- Request/response quedan guardados en `Invoice`.

### SSO
- Google: validacion de token contra `userinfo`.
- Facebook: validacion token en `me` y opcional `debug_token`.

## 3. Frontend
Archivo principal: `frontend/src/App.jsx`

Caracteristicas:
- Router custom por `window.history`.
- Vistas por portal (`admin`, `owner`, `student`) y vistas publicas.
- Login modal con tabs (ingresar/crear cuenta).
- Descubrir centros con:
  - geolocalizacion
  - geocoding (Nominatim)
  - mapa Leaflet
  - deep links a Google Maps

## 4. Validaciones de negocio tecnicas
- OrganizationSerializer: valida campos fiscales minimos en alta.
- StudioClassSerializer: valida capacidad y solapamientos.
- PaymentSerializer: valida consistencia entre tipo de pago y entidades asociadas.
- Views por modulo aplican controles de alcance por rol.

## 5. Observabilidad y logs
Estado actual:
- Logging default de Django.
- No hay stack centralizado aun (CloudWatch/ELK pendiente).

Recomendado:
- Agregar `LOGGING` estructurado JSON.
- Correlation ID por request.
- Alarmas para 4xx/5xx en API.

## 6. Riesgos tecnicos actuales
- Frontend monolitico en un solo archivo (`App.jsx`) con alta complejidad.
- CORS `ALLOW_ALL` en entorno dev.
- Integraciones MercadoPago/ARCA aun en modo simulado.
- Falta suite de tests automatizados end-to-end.

## 7. Roadmap tecnico sugerido
1. Refactor frontend por modulos/paginas.
2. Tests automatizados (API + UI).
3. Hardening de seguridad para produccion.
4. Observabilidad completa (logs, metricas, trazas).
5. Integracion real de MercadoPago y ARCA.
