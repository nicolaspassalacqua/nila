# Manual de Instalacion - NILA
Version: `1.0`
Fecha: `2026-03-11`

## 1. Requisitos
- Docker Desktop (Windows/Mac) o Docker Engine (Linux)
- Docker Compose v2
- Git

Opcional local (sin Docker):
- Python 3.12
- Node 20+
- PostgreSQL 16

## 2. Instalacion rapida con Docker (recomendado)

## 2.1 Clonar repositorio
```bash
git clone <repo-url>
cd NILA
```

## 2.2 Levantar servicios
```bash
docker compose up -d --build
```

Servicios esperados:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- DB PostgreSQL: `localhost:5432`

## 2.3 Credenciales base (dev)
- Usuario: `admin`
- Password: `admin1234`

## 2.4 Verificar salud
```bash
curl http://localhost:8000/api/health/
```
Respuesta esperada:
```json
{"status":"ok","service":"backend"}
```

## 3. Variables de entorno

Backend (referencia):
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `ALLOWED_HOSTS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

Frontend (referencia):
- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_FACEBOOK_APP_ID`
- `VITE_LOGIN_COVER_IMAGE`

## 4. Instalacion local sin Docker (opcional)

## 4.1 Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## 4.2 Frontend
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## 5. Comandos utiles

Recrear contenedores:
```bash
docker compose down
docker compose up -d --build
```

Ver logs:
```bash
docker compose logs -f --tail=200
```

Aplicar migraciones manuales:
```bash
docker compose exec backend python manage.py migrate
```

## 6. Solucion de problemas

### 6.1 Pantalla en blanco frontend
- Verificar logs frontend.
- Forzar recarga `Ctrl + F5`.
- Rebuild frontend: `docker compose up -d --build frontend`.

### 6.2 Error de conexion backend
- Verificar `http://localhost:8000/api/health/`.
- Revisar que backend este levantado.

### 6.3 Error DB
- Confirmar que contenedor `db` este healthy.
- Revisar credenciales `POSTGRES_*`.

### 6.4 SSO no disponible
- Revisar `platform-settings` en admin global.
- Revisar variables de entorno de provider.

## 7. Limpieza de entorno
```bash
docker compose down -v
```
Nota: elimina volumenes de DB.
