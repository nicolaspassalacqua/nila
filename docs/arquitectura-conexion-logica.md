# Conexion Logica De Componentes - NILA MVP

Estado: `MVP 1.0-alpha`

Este documento muestra la conexion logica entre componentes del sistema.

## 1) Vista de contexto (alto nivel)
```mermaid
flowchart LR
    U1[Cliente Web/Mobile] --> FE[Frontend Next.js]
    U2[Profesional Web/Mobile] --> FE

    FE -->|HTTPS / JWT| API[Django API / DRF]
    API --> DB[(PostgreSQL)]

    API --> AUTH[Auth JWT]
    API --> TEN[Tenancy / Memberships]
    API --> MKT[Marketplace Services]
    API --> CRM[CRM Clients]
    API --> BKG[Booking Appointments]

    subgraph Infra
      API
      DB
      FE
    end

    subgraph Docker Compose
      FE
      API
      DB
    end
```

## 2) Vista interna backend (modular)
```mermaid
flowchart TB
    REQ[HTTP Request] --> MW[DRF + Permissions]
    MW --> ACC[accounts]
    MW --> CORE[core]
    MW --> MKT[marketplace]
    MW --> CRM[crm]
    MW --> BKG[booking]

    CORE --> TA[tenant_access.py\nvalida X-Tenant-ID + membership]

    MKT --> SVC[(services)]
    CRM --> CLI[(clients)]
    BKG --> APP[(appointments)]
    CORE --> TEN[(tenants)]
    CORE --> MEM[(tenant_memberships)]
    ACC --> USR[(users)]

    TA --> TEN
    TA --> MEM
```

## 3) Flujo de autenticacion y acceso por tenant
```mermaid
sequenceDiagram
    participant User as Usuario
    participant FE as Frontend
    participant API as Django API
    participant DB as PostgreSQL

    User->>FE: Login (email/password)
    FE->>API: POST /api/auth/token/
    API->>DB: valida credenciales
    DB-->>API: usuario valido
    API-->>FE: access + refresh JWT

    User->>FE: operar en tenant X
    FE->>API: GET /api/services/ + JWT + X-Tenant-ID
    API->>API: tenant_access valida membership
    API->>DB: consulta datos filtrados por tenant
    DB-->>API: resultados
    API-->>FE: respuesta autorizada
```

## 4) Flujo de negocio MVP (reserva de turno)
```mermaid
sequenceDiagram
    participant Pro as Profesional
    participant FE as Frontend
    participant API as Django API
    participant DB as PostgreSQL

    Pro->>FE: crea cliente y servicio
    FE->>API: POST /api/clients/ (X-Tenant-ID)
    API->>DB: inserta client
    FE->>API: POST /api/services/ (X-Tenant-ID)
    API->>DB: inserta service

    Pro->>FE: crea turno
    FE->>API: POST /api/appointments/ (X-Tenant-ID)
    API->>DB: inserta appointment
    DB-->>API: OK
    API-->>FE: turno creado
```

## 5) Vista objetivo proxima iteracion
```mermaid
flowchart LR
    FE[Frontend] --> API[Django API]
    API --> DB[(PostgreSQL)]
    API --> WL[waitlist]
    API --> NT[notifications]
    API --> WA[whatsapp]
    API --> POS[pos]
    NT --> Q[(queue/worker)]
    WA --> Q
```

## 6) Leyenda
- `X-Tenant-ID`: encabezado obligatorio en endpoints de negocio.
- `JWT`: autenticacion de usuario.
- `tenant_memberships`: define acceso de usuario a empresa/tenant.

## 7) Mantenimiento
Actualizar este diagrama cuando cambie:
- estructura de modulos backend,
- estrategia de integracion frontend,
- nuevos servicios (waitlist, whatsapp, pos, workers).
