# NILA Monorepo

## Estructura
- `backend/` Django + DRF + JWT (multi-tenant)
- `frontend/` Next.js base (cliente/profesional)
- `mockups/` sistema visual y pantallas
- `docs/` runbooks y presentaciones

## Inicio rapido
1. `docker compose up --build`
2. Abrir `http://localhost:3000`
3. API en `http://localhost:8000/api/health/`

## Nota
Si ejecutas backend sin Docker:
```bash
cd backend
python manage.py migrate
python manage.py runserver
```
