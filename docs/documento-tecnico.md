# NILA - Plataforma Inteligente para Estudios de Pilates

Documento de Requerimientos Funcionales y No Funcionales (FRD + NFR)
Version: `4.0`
Autor: `Nicolas Passalacqua`
Fecha: `2026-03-11`

## 1. Introduccion
NILA es una plataforma digital para la gestion integral de estudios de Pilates con operacion multi-portal:
- Portal Administrador Global (gobierno de plataforma)
- Portal Owner (operacion de empresa/sedes)
- Portal Alumno (consumo de servicios)
- Portal Publico (marketing y descubrimiento de centros)

El sistema cubre gestion de organizaciones, sedes, salones, alumnos, clases, pagos, marketplace y capacidades de evolucion a IA/automatizaciones.

## 2. Objetivos del sistema
- Digitalizar la gestion completa del estudio.
- Escalar operacion multi-sede y multi-empresa.
- Mejorar la experiencia de alumnos y owners.
- Facilitar pagos y facturacion.
- Habilitar marketplace de estudios.
- Preparar base para modulos premium (IA, check-in, WhatsApp, recomendacion).

## 3. Actores del sistema
- Administrador global
- Owner (dueno de local)
- Instructor
- Alumno
- Sistema

## 4. Alcance actual (MVP implementado)
- Autenticacion JWT local y SSO (Google/Facebook) condicionado por configuracion global.
- Marketplace publico de organizaciones con geolocalizacion y mapa.
- Administracion global de usuarios, roles, owner-organizacion y settings de plataforma.
- Modulo Organizacion/Sedes/Salones.
- Modulo Alumnos con historial y autoasociacion a empresas.
- Modulo Clases con validaciones de capacidad, solapamientos y bloqueos de salon.
- Modulo Pagos/Membresias/Comprobantes (flujo MercadoPago simulado + emision ARCA simulada).
- Dashboard resumido por perfil.

## 5. Requerimientos funcionales

## 5.1 Portales y acceso
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-061 | Portal administrador global | Consola de gobierno de toda la plataforma | Administrador global | Alta |
| FR-062 | Portal owner | Consola de gestion operativa de su empresa | Owner | Alta |
| FR-063 | Portal alumno | Vista de perfil, asociacion y pagos | Alumno | Alta |
| FR-068 | Resolver portal por perfil | Determinar experiencia segun rol al autenticarse | Sistema | Alta |
| FR-069 | Reset de contrasena | Reasignar contrasena de usuarios | Administrador global | Alta |
| FR-070 | Eliminar usuario | Eliminar usuarios no requeridos | Administrador global | Alta |

## 5.2 Organizacion y sedes
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-001 | Crear organizacion | Registrar empresa/organizacion | Owner | Alta |
| FR-002 | Crear establecimiento | Registrar nuevas sedes | Owner | Alta |
| FR-003 | Editar establecimiento | Modificar sede existente | Owner | Alta |
| FR-004 | Desactivar establecimiento | Desactivar sede sin perder historico | Owner | Media |
| FR-005 | Configurar horarios por sede | Horarios por dia con horario cortado | Owner | Alta |
| FR-005A | Editar empresa | Modificar datos fiscales/comerciales | Owner | Alta |
| FR-005B | Bloqueo de razon social por emision fiscal | Impedir cambio de razon social con documento fiscal emitido | Sistema | Alta |
| FR-005C | Una sola empresa por owner | Restringir multiple empresa por owner | Sistema | Alta |
| FR-005D | Eliminar establecimiento | Eliminar sede creada por owner | Owner | Media |

## 5.3 Salones
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-006 | Crear salon | Registrar salones dentro de una sede | Owner | Alta |
| FR-007 | Definir capacidad del salon | Configurar capacidad maxima por salon | Owner | Alta |
| FR-008 | Asignar salon a clase | Asignar salon a clase programada | Instructor | Alta |
| FR-009 | Bloquear salon | Bloquear por mantenimiento/evento | Owner | Media |

## 5.4 Alumnos
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-010 | Registrar alumno | Alta de alumno por owner/admin | Owner | Alta |
| FR-011 | Editar alumno | Actualizar datos del alumno | Owner | Alta |
| FR-012 | Historial del alumno | Consultar eventos e historial | Owner / Instructor | Media |
| FR-013 | Nivel del alumno | Registrar/actualizar nivel | Owner / Instructor | Media |
| FR-071A | Registro self-service marketplace | Alumno crea cuenta y se asocia a empresa | Alumno | Alta |
| FR-071B | Alumno multi-empresa | Un mismo usuario alumno puede asociarse a varias empresas | Sistema | Alta |
| FR-071C | SSO de alumno | Alta/login de alumno via Google/Facebook segun policy global | Alumno / Sistema | Alta |

## 5.5 Clases
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-014 | Crear clase | Alta de clase en calendario | Instructor | Alta |
| FR-015 | Definir capacidad de clase | Capacidad <= capacidad del salon | Instructor | Alta |
| FR-016 | Asignar instructor | Asignar instructor responsable | Owner | Alta |
| FR-017 | Definir horario de clase | Fecha/hora de inicio y fin | Instructor | Alta |
| FR-018 | Cancelar clase | Cancelar clase programada | Instructor | Media |
| FR-018A | Evitar solapamientos | Evitar choque de salon o instructor en el mismo rango horario | Sistema | Alta |

## 5.6 Pagos y finanzas
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-023 | Integracion MercadoPago | Flujo de checkout por pago | Sistema | Alta |
| FR-024 | Pago de clases | Pago de clase individual | Alumno | Alta |
| FR-025 | Pago de membresias | Pago de plan de membresia | Alumno | Alta |
| FR-026 | Registro automatico de pagos | Actualizar estado por webhook/manual | Sistema | Alta |
| FR-027 | Historial de pagos | Visualizar pagos por perfil | Admin / Owner / Alumno | Alta |
| FR-027A | Facturacion electronica (ARCA) | Emision de comprobantes sobre pagos aprobados | Sistema | Alta |

## 5.7 Marketplace publico y marketing
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-071 | Descubrir centros sin login | Busqueda publica de centros por nombre/ciudad/direccion | Publico | Alta |
| FR-072 | Geolocalizacion de cercania | Ordenar centros por cercania usando geolocalizacion del dispositivo | Sistema | Alta |
| FR-073 | Mapa interactivo de centros | Mostrar marcadores de sucursales y seleccion por mapa | Publico | Alta |
| FR-074 | Navegacion a Google Maps | Abrir "como llegar" y mapa externo del centro seleccionado | Publico | Alta |
| FR-075 | Seccion Quienes somos | Landing publica informativa | Publico | Media |
| FR-076 | Seccion Precios y planes | Landing publica comercial | Publico | Media |

## 6. Requerimientos no funcionales (NFR)

## 6.1 Seguridad
| ID | NFR | Criterio de aceptacion |
|---|---|---|
| RNF-001 | Autenticacion JWT | Endpoints privados requieren bearer token valido |
| RNF-002 | Autorizacion por rol | Acciones restringidas por admin/owner/instructor/alumno |
| RNF-003 | Password policy minima | Alta/reset exige minimo 8 caracteres |
| RNF-004 | Segregacion multi-tenant logica | Owner no opera datos fuera de sus organizaciones |
| RNF-005 | Proteccion de endpoints publicos | Solo endpoints declarados usan `AllowAny` |

## 6.2 Rendimiento y escalabilidad
| ID | NFR | Criterio de aceptacion |
|---|---|---|
| RNF-010 | Tiempo de respuesta API | p95 < 800 ms en operaciones CRUD tipicas |
| RNF-011 | Soporte de concurrencia base | Operacion estable con >= 100 requests concurrentes en lectura |
| RNF-012 | Escalabilidad horizontal | Servicios Docker stateless (frontend/backend) escalables por replica |

## 6.3 Disponibilidad y operacion
| ID | NFR | Criterio de aceptacion |
|---|---|---|
| RNF-020 | Contenerizacion completa | Frontend, backend y DB desplegables por Docker Compose |
| RNF-021 | Healthcheck de backend | Endpoint `/api/health/` disponible |
| RNF-022 | Recuperacion de servicio | Reinicio de contenedores con `restart: unless-stopped` |
| RNF-023 | Persistencia DB | Volumen persistente para PostgreSQL |

## 6.4 Calidad, mantenibilidad y UX
| ID | NFR | Criterio de aceptacion |
|---|---|---|
| RNF-030 | Arquitectura modular | Backend organizado por modulos tipo addon (`studio/modules/*`) |
| RNF-031 | Compatibilidad de API | Enrutado consolidado en `studio/urls.py` |
| RNF-032 | Usabilidad | Navegacion por portal y menu publico consistente |
| RNF-033 | Responsive | Pantallas clave usables en desktop y mobile |
| RNF-034 | Accesibilidad base | Atajos/herramientas de accesibilidad en frontend |

## 7. Reglas de negocio clave
- Un owner solo puede crear una empresa.
- Solo admin puede modificar habilitaciones globales de plataforma (SSO, modulos por plan, suscripciones).
- Un alumno puede pertenecer a multiples organizaciones.
- Razon social se bloquea cuando existe emision fiscal.
- Capacidad de clase no puede superar capacidad de salon.
- Salon bloqueado o con conflicto horario no se puede asignar a clase.

## 8. Integraciones y dependencias
- Autenticacion social: Google OAuth (token validation) y Facebook Graph API.
- Pagos: MercadoPago (checkout y webhook).
- Facturacion: ARCA (simulada en MVP con payload/request-response persistidos).
- Geocoding: Nominatim (OpenStreetMap) para coordenadas de sucursales.
- Mapa: Leaflet + OpenStreetMap.

## 9. Stack TIC
- Frontend: React + Vite.
- Backend: Django + Django REST Framework + SimpleJWT.
- DB: PostgreSQL.
- Infra: Docker Compose, ECR, EC2.
- Repositorio: GitHub.

## 10. Criterio de cierre (Definition of Done documental)
Se considera cubierta la documentacion base cuando existen y estan actualizados:
- `docs/documento-tecnico.md`
- `docs/manual-desarrollador.md`
- `docs/manual-usuario.md`
- `docs/manual-tecnico.md`
- `docs/manual-instalacion.md`
- `docs/manual-aws.md`
- `docs/arquitectura.md`
- `docs/README.md`
