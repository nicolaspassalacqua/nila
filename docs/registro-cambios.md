# Registro De Cambios

Formato:
`YYYY-MM-DD | area | resumen | archivo(s)`

## Cambios
- 2026-02-13 | docs | Creacion de base documental completa para MVP (instalacion, dev, tecnico, arquitectura, usuario) | README.md, manual-*.md, documento-tecnico.md, arquitectura.md
- 2026-02-13 | backend | Scaffold Django + DRF + JWT + multi-tenant base (tenants, memberships, servicios, clientes, turnos) | backend/*
- 2026-02-13 | frontend | Scaffold Next.js con vistas iniciales cliente/profesional | frontend/*
- 2026-02-13 | infra | Docker Compose inicial (db + backend + frontend) | docker-compose.yml
- 2026-02-13 | backend | Modulos waitlist, notifications y pos agregados con endpoints CRUD y acciones MVP (`cancel`, `offer-from-cancel`, `mark-paid`) | backend/waitlist/*, backend/notifications/*, backend/pos/*, backend/config/urls.py, backend/booking/views.py
- 2026-02-13 | frontend | Workspace funcional cliente/profesional conectado a API | frontend/app/client/workspace/page.tsx, frontend/app/professional/workspace/page.tsx, frontend/lib/api.ts
- 2026-02-13 | backend/infra | Seed automatico MVP al iniciar contenedor (admin + tenant demo + datos demo) | backend/core/management/commands/seed_mvp.py, backend/entrypoint.sh, backend/Dockerfile, docker-compose.yml

## Proximo update esperado
- Worker asyncrono para expiracion de waitlist y despacho de message queue.
