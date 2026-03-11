# Deploy EC2 + Docker Compose

## 1) Requisitos en EC2

- Ubuntu 22.04 (o similar)
- Docker + Docker Compose plugin
- AWS CLI con permisos para ECR

Instalacion rapida (Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin awscli
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Subir imagenes a ECR

Desde tu maquina local (este repo):

```powershell
# Opcion recomendada (usa el script del repo)
powershell -ExecutionPolicy Bypass -File .\scripts\push-ecr.ps1

# Opcion manual:
# Login ECR
(Get-ECRLoginCommand -Region us-east-2).Password | docker login --username AWS --password-stdin 701527496236.dkr.ecr.us-east-2.amazonaws.com

# Backend
docker build -t nila-backend .\backend
docker tag nila-backend:latest 701527496236.dkr.ecr.us-east-2.amazonaws.com/nila-backend:latest
docker push 701527496236.dkr.ecr.us-east-2.amazonaws.com/nila-backend:latest

# Frontend (prod)
docker build -t nila-frontend -f .\frontend\Dockerfile.prod .\frontend
docker tag nila-frontend:latest 701527496236.dkr.ecr.us-east-2.amazonaws.com/nila-frontend:latest
docker push 701527496236.dkr.ecr.us-east-2.amazonaws.com/nila-frontend:latest
```

## 3) Copiar archivos a EC2

Copiar estos archivos al servidor:

- `docker-compose.ec2.yml`
- `.env.ec2` (copia de `.env.ec2.example` con valores reales)

## 4) Ejecutar en EC2

```bash
# Login en ECR (en la instancia EC2)
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 701527496236.dkr.ecr.us-east-2.amazonaws.com

# Levantar
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 pull
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 up -d

# Estado
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 ps
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 logs -f --tail=200
```

## 5) Puertos del Security Group

- `80/tcp` para frontend
- `8000/tcp` para backend API

## 6) Verificacion

- Frontend: `http://<EC2_PUBLIC_IP>/`
- API: `http://<EC2_PUBLIC_IP>:8000/api/auth/marketplace-organizations/`

## 7) Notas

- Este despliegue es simple para Sprint/MVP.
- Para produccion real: usar HTTPS (ALB + ACM o Nginx+Caddy), RDS para PostgreSQL y ECS/Fargate.
