# Manual de Desarrollador - NILA
Version: `1.0`
Fecha: `2026-03-11`

## 1. Objetivo
Este manual describe como desarrollar, extender y mantener NILA en backend, frontend e integraciones.

## 2. Estructura del repositorio
```text
NILA/
  backend/
    config/                 # settings y urls globales Django
    studio/
      modules/
        core/               # organizaciones, sedes, salones, memberships
        users/              # auth, SSO, users, roles, platform settings
        students/           # alumnos e historial
        classes/            # clases, validaciones de agenda
        payments/           # membresias, pagos, comprobantes
        dashboard/          # resumen de metricas
      urls.py               # router principal API
      models.py             # aggregator de modelos
      serializers.py        # aggregator de serializers
      views.py              # aggregator de views
  frontend/
    src/
      App.jsx               # shell principal y navegacion por portal
      App.css               # estilos globales
      main.jsx              # bootstrap React
  docs/
  docker-compose.yml
  docker-compose.ec2.yml
```

## 3. Stack y runtime
- Backend: Django + DRF + SimpleJWT
- Frontend: React + Vite
- DB: PostgreSQL
- Contenedores: Docker / Docker Compose

## 4. Backend: arquitectura modular
Patron modular tipo addon:
- Cada dominio tiene `models.py`, `serializers.py`, `views.py` propios.
- `studio/urls.py` unifica rutas para todos los modulos.
- `studio/models.py` y `studio/serializers.py` preservan imports legacy.

### 4.1 Modulo `core`
Archivos:
- `backend/studio/modules/core/models.py`
- `backend/studio/modules/core/serializers.py`
- `backend/studio/modules/core/views.py`

Responsabilidades:
- `Organization`: datos fiscales/comerciales y flags de suscripcion/modulos.
- `Establishment`: sucursales con horario base y `weekly_hours`.
- `Room`: salones con capacidad y bloqueo temporal.
- `OrganizationMembership`: relacion usuario-owner con organizacion.

Reglas clave implementadas:
- Owner solo crea 1 empresa.
- Bloqueo de razon social cuando `fiscal_document_issued = true`.
- Owner no puede editar flags reservados de plataforma (`enabled_modules`, `subscription_*`, etc.).

### 4.2 Modulo `users`
Archivos:
- `backend/studio/modules/users/models.py`
- `backend/studio/modules/users/services.py`
- `backend/studio/modules/users/serializers.py`
- `backend/studio/modules/users/views.py`

Responsabilidades:
- `PlatformSetting` singleton para policy de SSO.
- CRUD de usuarios (admin only).
- Asignacion de roles (`admin`, `owner`, `instructor`, `alumno`).
- Relacion owner-organizacion.
- SSO Google/Facebook + registro marketplace.
- Endpoint `auth/me` para resolver portal.

### 4.3 Modulo `students`
Archivos:
- `backend/studio/modules/students/models.py`
- `backend/studio/modules/students/serializers.py`
- `backend/studio/modules/students/views.py`

Responsabilidades:
- `Student`: perfil de alumno por organizacion.
- `StudentHistory`: bitacora de eventos.
- Alta/edicion/asignacion a sedes.
- Auto-asociacion de alumno a organizaciones (marketplace).
- Nivel y notas de historial.

### 4.4 Modulo `classes`
Archivos:
- `backend/studio/modules/classes/models.py`
- `backend/studio/modules/classes/serializers.py`
- `backend/studio/modules/classes/views.py`

Responsabilidades:
- Gestion de clases con estado (`scheduled`, `canceled`, `completed`).
- Validaciones:
  - sede pertenece a organizacion
  - salon pertenece a sede
  - salon activo y no bloqueado
  - fin > inicio
  - capacidad > 0 y <= capacidad de salon
  - no solapar salon/instructor en horario
- Acciones: asignar instructor, asignar salon, cancelar.

### 4.5 Modulo `payments`
Archivos:
- `backend/studio/modules/payments/models.py`
- `backend/studio/modules/payments/serializers.py`
- `backend/studio/modules/payments/services.py`
- `backend/studio/modules/payments/views.py`

Responsabilidades:
- `MembershipPlan`, `Payment`, `Invoice`.
- Checkout MercadoPago (simulado con URL construida).
- Webhook MercadoPago para cambio de estado.
- Emision ARCA simulada para pagos aprobados.

### 4.6 Modulo `dashboard`
Archivos:
- `backend/studio/modules/dashboard/models.py`
- `backend/studio/modules/dashboard/views.py`

Responsabilidades:
- Resumen de metricas por perfil (admin/owner/otros).

## 5. API principal
Base URL local: `http://localhost:8000/api`

Autenticacion:
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`

Marketplace/SSO:
- `GET /api/auth/marketplace-organizations/`
- `POST /api/auth/register-student/`
- `POST /api/auth/sso/google/`
- `POST /api/auth/sso/facebook/`

Core:
- `/api/organizations/`
- `/api/establishments/`
- `/api/rooms/`

Students:
- `/api/students/`
- `POST /api/students/{id}/assign-establishments/`
- `POST /api/students/{id}/set-level/`
- `GET /api/students/{id}/history/`

Classes:
- `/api/classes/`
- `POST /api/classes/{id}/assign-room/`
- `POST /api/classes/{id}/assign-instructor/`
- `POST /api/classes/{id}/cancel/`

Payments:
- `/api/membership-plans/`
- `/api/payments/`
- `POST /api/payments/{id}/create-checkout/`
- `POST /api/payments/mercadopago/webhook/`
- `POST /api/payments/{id}/mark-paid/`
- `POST /api/payments/{id}/emit-invoice/`
- `/api/invoices/`

Admin global:
- `/api/users/`
- `/api/platform-settings/`

## 6. Frontend
Archivo principal: `frontend/src/App.jsx` (single-page shell con enrutado por `window.history`).

Rutas publicas:
- `/login`
- `/descubrir-centros`
- `/quienes-somos`
- `/precios-planes`

Rutas portal:
- `/admin`
- `/owner`
- `/student`

Flujos clave frontend:
- Resuelve portal via `GET /api/auth/me/`.
- Carga marketplace publico sin token.
- Geocoding de sedes con Nominatim y cache en `localStorage`.
- Mapa con Leaflet y salida a Google Maps.

## 7. Convenciones de desarrollo
- Mantener logica de negocio en modulos de dominio, no en `studio/urls.py`.
- Validaciones de input en serializers.
- Restricciones de permisos en ViewSets/acciones.
- No acoplar frontend a un solo portal; respetar navegacion multi-portal.
- No romper compatibilidad de rutas publicas existentes.

## 8. Como agregar un nuevo modulo backend
1. Crear carpeta `backend/studio/modules/<modulo>/`.
2. Agregar `models.py`, `serializers.py`, `views.py`.
3. Registrar rutas en `studio/urls.py`.
4. Exportar clases necesarias en `studio/models.py` si aplica.
5. Crear migraciones y aplicar.
6. Actualizar `docs/documento-tecnico.md` y manuales.

## 9. Flujo recomendado para cambios
1. Actualizar requerimiento en FRD.
2. Implementar backend (modelo -> serializer -> view -> ruta).
3. Implementar frontend.
4. Ejecutar build frontend y chequeo backend.
5. Actualizar documentacion y criterios de aceptacion.

## 10. Checklist de PR
- [ ] Permisos por rol revisados
- [ ] Validaciones de negocio revisadas
- [ ] Sin hardcode de secretos
- [ ] Build frontend OK
- [ ] Migraciones incluidas (si aplica)
- [ ] Documentacion actualizada

## 11. Troubleshooting para devs
- Error CORS: revisar `CORS_ALLOW_ALL_ORIGINS` y URL frontend/backend.
- 401 en API: token vencido o faltante.
- Owner sin datos: verificar `OrganizationMembership` activo.
- Clase no guarda: revisar validaciones de capacidad/solapamiento/salon bloqueado.
- SSO falla: revisar `PlatformSetting` y credenciales del proveedor.
