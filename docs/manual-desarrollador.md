# Manual De Desarrollador

Estado: `MVP 1.1-alpha`

## 1. Estructura
- `backend/` Django + DRF + JWT.
- `frontend/` Next.js.
- `docs/` documentacion viva.

## 2. Apps backend
- `accounts`
- `core`
- `marketplace`
- `crm`
- `booking`
- `waitlist`
- `notifications`
- `pos`

## 3. Regla multi-tenant (obligatoria)
- Endpoints de negocio requieren `X-Tenant-ID`.
- Validacion central en `core/tenant_access.py`.

## 4. Endpoints nuevos destacados
- `POST /api/appointments/{id}/cancel/`
- `POST /api/waitlist-offers/offer-from-cancel/`
- `POST /api/orders/{id}/mark-paid/`

## 5. Flujo dev recomendado
1. Implementar cambio modular.
2. `python manage.py makemigrations && migrate && check`.
3. Probar endpoint manualmente.
4. Actualizar docs y `registro-cambios.md`.

## 6. Deuda tecnica inmediata
- Workers asyncronos (waitlist expiry + message queue sender).
- Tests API por modulo.
- Logging estructurado y auditoria de acciones criticas.
