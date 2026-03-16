# Manual de AWS - NILA
Version: `1.0`
Fecha: `2026-03-11`

## 1. Objetivo
Desplegar NILA en AWS usando:
- Amazon ECR para imagenes
- Amazon EC2 para runtime Docker Compose

## 2. Arquitectura objetivo (MVP)
- EC2 ejecuta `frontend`, `backend`, `db` via `docker compose`.
- ECR almacena imagenes:
  - `nila-backend`
  - `nila-frontend`
- PostgreSQL corre en contenedor con volumen persistente.

## 3. Prerrequisitos AWS
- Cuenta AWS activa
- IAM user/role con permisos para ECR y EC2
- AWS CLI configurada (`aws configure`)
- Security Group con puertos:
  - `80/tcp` (frontend)
  - `8000/tcp` (backend API)
  - `22/tcp` (SSH restringido por IP)

## 4. ECR: build y push
Repositorio y script incluidos:
- `scripts/push-ecr.ps1`

Comando recomendado (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\push-ecr.ps1
```

Este script:
1. Asegura repos `nila-backend` y `nila-frontend`.
2. Hace login en ECR.
3. Build/tag/push de backend y frontend.

## 5. Archivos de despliegue EC2
- `docker-compose.ec2.yml`
- `.env.ec2` (partir de `.env.ec2.example`)

Variables criticas en `.env.ec2`:
- `DJANGO_SECRET_KEY`
- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD`
- `ALLOWED_HOSTS`
- `ECR_REGISTRY`

Admin por defecto en deploy:
- Usuario: `admin`
- Email: `admin@nila.local`
- Password por defecto: `admin1234`
- Si queres otro valor, sobreescribe `ADMIN_USERNAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env.ec2`.

## 6. Despliegue en EC2
En la instancia:
```bash
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 701527496236.dkr.ecr.us-east-2.amazonaws.com

docker compose -f docker-compose.ec2.yml --env-file .env.ec2 pull
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 up -d
```

Verificacion:
```bash
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 ps
curl http://localhost:8000/api/health/
```

## 7. Actualizacion de version
1. Build/push nuevas imagenes a ECR.
2. En EC2:
```bash
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 pull
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 up -d
```

## 8. Rollback
- Usar tags versionadas (ejemplo `v1.2.0`) en lugar de solo `latest`.
- Ajustar `BACKEND_TAG` y `FRONTEND_TAG` en `.env.ec2`.
- Ejecutar `pull` + `up -d`.

## 9. Hardening recomendado para produccion
- HTTPS con ALB + ACM (o Nginx/Caddy con TLS).
- Mover PostgreSQL a Amazon RDS.
- CloudWatch Logs para backend/frontend.
- WAF si se expone internet publico.
- Secrets Manager / SSM Parameter Store para secretos.
- Backups automativos DB y plan de restore probado.

## 10. Observabilidad sugerida
- CloudWatch metricas EC2 (CPU, RAM, disk).
- Alarmas de salud endpoint `/api/health/`.
- Dashboard de errores 4xx/5xx por API.

## 11. Costos y evolucion
MVP con EC2 + Compose es costo-efectivo y rapido.
Evolucion recomendada:
- ECS/Fargate para escalado y operacion administrada.
- RDS + ElastiCache + ALB para arquitectura productiva.

## 12. CI/CD con GitHub
El repositorio incluye workflow para sincronizar GitHub con AWS:
- Build/push a ECR
- Deploy automatico en EC2

Documento de setup:
- `docs/github-actions-aws.md`
