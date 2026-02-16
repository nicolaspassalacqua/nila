# Manual De Instalacion

Estado: `MVP 1.0-alpha`

## 1. Requisitos
- Docker Desktop 4.x o superior.
- (Opcional sin Docker) Python 3.12+, Node 20+.

## 2. Instalacion rapida (recomendada)
Desde la raiz del proyecto:
```bash
docker compose up --build
```

Servicios esperados:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Health API: `http://localhost:8000/api/health/`
- PostgreSQL: `localhost:5432`

## 3. Variables de entorno backend
Archivo base: `backend/.env.example`

Variables actuales:
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DB_ENGINE`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

## 4. Instalacion sin Docker (opcional)
### Backend
```bash
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 5. Validacion post instalacion
1. Abrir `http://localhost:8000/api/health/` y verificar `status: ok`.
2. Abrir `http://localhost:3000`.
3. Ejecutar registro y login via API.

## 6. Problemas comunes
- Puerto ocupado: cambiar mapeo en `docker-compose.yml`.
- Error DB: revisar `DB_HOST=db` y que el contenedor `db` este levantado.
- Frontend no levanta: confirmar Node 20+ o usar Docker.
