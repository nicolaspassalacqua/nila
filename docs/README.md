# Documentacion NILA

Indice de documentacion del proyecto.

## Documentos principales
- [Documento tecnico FRD + NFR](./documento-tecnico.md)
- [Manual de desarrollador](./manual-desarrollador.md)
- [Manual de usuario](./manual-usuario.md)
- [Manual tecnico](./manual-tecnico.md)
- [Manual de instalacion](./manual-instalacion.md)
- [Manual de AWS](./manual-aws.md)
- [GitHub Actions + AWS (ECR + EC2)](./github-actions-aws.md)
- [Manual de arquitectura](./arquitectura.md)
- [Referencia de codigo](./referencia-codigo.md)
- [Guia de despliegue EC2 (resumen operativo)](./deploy-ec2.md)

## Cobertura
- Requerimientos funcionales y no funcionales.
- Arquitectura modular backend (tipo addon/Odoo-like).
- Operacion multi-portal (admin, owner, student, publico).
- Integraciones: SSO, MercadoPago, ARCA (simulada), mapa/geolocalizacion.
- Instalacion local y despliegue en AWS.

## Convencion de versionado
- Se recomienda mantener en cada documento:
  - Version
  - Fecha de ultima actualizacion
  - Responsable

## Regla de actualizacion
Cada cambio funcional relevante debe actualizar:
1. `documento-tecnico.md`
2. El manual especifico impactado (usuario, tecnico, instalacion, etc.)
3. Este indice si se agrega o elimina documentacion
