# Referencia de Codigo - NILA
Version: `1.0`
Fecha: `2026-03-11`

## 1. Objetivo
Inventario de archivos relevantes y su responsabilidad para facilitar mantenimiento.

## 2. Backend

## 2.1 Capa de configuracion
- `backend/config/settings.py`: configuracion Django (DB, auth, CORS, apps).
- `backend/config/urls.py`: rutas globales (`/admin`, `/api/health`, `/api/*`).
- `backend/config/asgi.py`: entrada ASGI.
- `backend/config/wsgi.py`: entrada WSGI.
- `backend/manage.py`: CLI Django.

## 2.2 Agregadores de compatibilidad
- `backend/studio/models.py`: exporta modelos de todos los modulos.
- `backend/studio/serializers.py`: exporta serializers de modulos.
- `backend/studio/views.py`: exporta views de modulos.
- `backend/studio/urls.py`: router de API y endpoints auth/dashboard.

## 2.3 Modulo core
- `modules/core/models.py`: Organization, Establishment, Room, OrganizationMembership.
- `modules/core/serializers.py`: validaciones fiscales y de bloqueo de salon.
- `modules/core/views.py`: CRUD y acciones de core con seguridad por rol.

## 2.4 Modulo users
- `modules/users/models.py`: UserProfile y PlatformSetting.
- `modules/users/services.py`: utilidades de roles/permisos.
- `modules/users/serializers.py`: UserSerializer y PlatformSettingSerializer.
- `modules/users/views.py`: auth, SSO, users admin, platform settings.

## 2.5 Modulo students
- `modules/students/models.py`: Student y StudentHistory.
- `modules/students/serializers.py`: serializers de alumnos/historial.
- `modules/students/views.py`: CRUD, historial, nivel, asociacion marketplace.

## 2.6 Modulo classes
- `modules/classes/models.py`: StudioClass.
- `modules/classes/serializers.py`: validaciones de agenda/capacidad/conflictos.
- `modules/classes/views.py`: CRUD y acciones assign-room/assign-instructor/cancel.

## 2.7 Modulo payments
- `modules/payments/models.py`: MembershipPlan, Payment, Invoice.
- `modules/payments/serializers.py`: validaciones de tipos de pago.
- `modules/payments/services.py`: checkout MP, status, emision ARCA simulada.
- `modules/payments/views.py`: CRUD y acciones de cobro/facturacion.

## 2.8 Modulo dashboard
- `modules/dashboard/models.py`: DashboardSnapshot.
- `modules/dashboard/views.py`: resumen por perfil.

## 2.9 Infra backend
- `backend/Dockerfile`: imagen de desarrollo/backend.
- `backend/entrypoint.prod.sh`: migraciones + seed de admin + gunicorn.
- `backend/requirements.txt`: dependencias Python.

## 3. Frontend
- `frontend/src/main.jsx`: entrypoint React.
- `frontend/src/App.jsx`: UI principal (publico + admin + owner + student).
  - Rutas publicas incluidas: `/login`, `/descubrir-centros`, `/quienes-somos`, `/precios-planes`.
  - Menu de ayuda contextual global por pantalla.
- `frontend/src/App.css`: estilos globales y responsive.
- `frontend/public/cover-login.jpg`: portada login.
- `frontend/vite.config.js`: configuracion Vite.
- `frontend/package.json`: scripts y dependencias.
- `frontend/Dockerfile`: build/runtime dev.
- `frontend/Dockerfile.prod`: build/runtime prod con `serve`.

## 4. Infra de despliegue
- `docker-compose.yml`: stack local dev.
- `docker-compose.ec2.yml`: stack productivo simple para EC2.
- `.env.ec2.example`: plantilla de variables de despliegue.
- `scripts/push-ecr.ps1`: build/push de imagenes a ECR.

## 5. Documentacion asociada
- `docs/documento-tecnico.md`
- `docs/manual-desarrollador.md`
- `docs/manual-usuario.md`
- `docs/manual-tecnico.md`
- `docs/manual-instalacion.md`
- `docs/manual-aws.md`
- `docs/arquitectura.md`
- `docs/deploy-ec2.md`
