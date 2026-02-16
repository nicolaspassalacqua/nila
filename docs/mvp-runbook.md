# NILA MVP - Runbook

Estado: `MVP 1.2-alpha`

## 1) Levantar con Docker (con seed automatico)
```bash
docker compose down
docker compose up --build
```

El backend ejecuta automaticamente:
- `migrate`
- `seed_mvp` (si `SEED_MVP=1`)

## 2) Credenciales demo
- Usuario: `admin`
- Password: `admin12345`
- Tenant demo slug: `demo-center`

## 3) URLs clave
- Home: `http://localhost:3000`
- Workspace Profesional: `http://localhost:3000/professional/workspace`
- Workspace Cliente: `http://localhost:3000/client/workspace`
- API health: `http://localhost:8000/api/health/`

## 4) Uso rapido MVP
1. Ir a workspace profesional y hacer login con demo.
2. Crear/editar servicios, clientes y turnos.
3. Cancelar turno y generar oferta waitlist.
4. Registrar ventas y pagos en POS.
5. Ver resultados en workspace cliente.

## 5) Apagar seed automatico
En `docker-compose.yml`, cambiar:
- `SEED_MVP: "1"` -> `SEED_MVP: "0"`
