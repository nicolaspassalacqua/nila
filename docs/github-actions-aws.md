# GitHub Actions + AWS (ECR + EC2)
Version: `1.0`
Fecha: `2026-03-11`

## 1. Objetivo
Automatizar desde GitHub:
- Build de imagenes backend/frontend
- Push a Amazon ECR
- Deploy en EC2 con `docker compose`

Workflow incluido:
- `.github/workflows/deploy-aws-ec2.yml`

## 2. Arquitectura del pipeline
1. Push a `main` (o `workflow_dispatch` manual).
2. GitHub Actions asume un role IAM con OIDC (sin access keys).
3. Build/push a ECR:
   - `nila-backend`
   - `nila-frontend`
4. SSH a EC2:
   - sincroniza `docker-compose.ec2.yml`
   - actualiza `ECR_REGISTRY`, `BACKEND_TAG`, `FRONTEND_TAG` en `.env.ec2`
   - `docker compose pull && docker compose up -d`

## 3. Configuracion AWS (OIDC)
Si no existe, crear provider OIDC en IAM:
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

Crear role IAM para GitHub Actions con trust policy (reemplazar `OWNER/REPO`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Nota: la condicion `sub` anterior habilita solo `main`. Si queres correr desde otra branch o tags, agrega esos patrones.

Adjuntar policy al role (ajustar region/account si queres restringir):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:CreateRepository",
        "ecr:DescribeRepositories",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    }
  ]
}
```

## 4. Configuracion GitHub
En `Settings > Secrets and variables > Actions`:

### Secrets obligatorios
- `AWS_ROLE_TO_ASSUME`: ARN del role IAM de OIDC.
- `EC2_HOST`: IP o DNS publico de EC2.
- `EC2_USER`: usuario SSH (ejemplo: `ubuntu`).
- `EC2_SSH_KEY`: private key PEM para acceder a EC2.

### Variables recomendadas
- `AWS_REGION`: por defecto el workflow usa `us-east-2`.
- `EC2_APP_DIR`: carpeta app en servidor (default: `/opt/nila`).
- `VITE_API_URL`: URL publica del backend para build frontend.
- `VITE_GOOGLE_CLIENT_ID` y `VITE_FACEBOOK_APP_ID` si usas SSO.

Admin por defecto en backend:
- Si `.env.ec2` no define otra cosa, el contenedor crea/actualiza un superusuario `admin`
- Email por defecto: `admin@nila.local`
- Password por defecto: `admin1234`
- Recomendado: cambiar `ADMIN_PASSWORD` en cuanto el deploy quede operativo

## 5. Requisitos en EC2
1. Docker + Docker Compose plugin + AWS CLI instalados.
2. Archivo `.env.ec2` presente en `EC2_APP_DIR`.
3. Permisos para `docker` con el usuario SSH (o ajustar a `sudo docker`).
4. Permisos AWS en la instancia para pull de ECR (ejemplo: `AmazonEC2ContainerRegistryReadOnly` en instance profile).

Archivos esperados en servidor:
- `docker-compose.ec2.yml` (el workflow lo sube).
- `.env.ec2` (se crea manualmente desde `.env.ec2.example`).

## 6. Activacion
1. Configurar IAM + secrets/variables.
2. Hacer push a `main` o ejecutar `workflow_dispatch`.
3. Ver logs en `Actions > deploy-aws-ec2`.

## 7. Rollback rapido
En EC2, setear tags previos en `.env.ec2`:
- `BACKEND_TAG=sha-...`
- `FRONTEND_TAG=sha-...`

Luego:
```bash
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 pull
docker compose -f docker-compose.ec2.yml --env-file .env.ec2 up -d
```
