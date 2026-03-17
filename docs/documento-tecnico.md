# NILA - Plataforma Inteligente para Estudios de Pilates

Documento de Requerimientos Funcionales y No Funcionales (FRD + NFR)
Version: `4.3`
Autor: `Nicolas Passalacqua`
Fecha: `2026-03-16`

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
- Login y alta de empresa/alumno con rutas diferenciadas por portal.
- Marketplace publico de organizaciones con geolocalizacion y mapa.
- Administracion global de usuarios, roles, owner-organizacion, settings de plataforma y planes de suscripcion de plataforma.
- Modulo Organizacion/Sedes/Salones.
- Modulo Alumnos con historial y autoasociacion a empresas.
- Modulo Clases con validaciones de capacidad, solapamientos y bloqueos de salon.
- Modulo Instructores con esquema economico y liquidacion mensual.
- Modulo Pagos/Membresias/Comprobantes (flujo MercadoPago simulado + emision ARCA simulada).
- Suscripcion de plataforma con trial, pago manual y Mercado Pago.
- Configuracion comercial owner para planes/suscripciones de sus clientes.
- Dashboard resumido por perfil.
- Frontend responsive con navegacion adaptada a mobile.

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
| FR-077 | Login SSO de empresa | Login/alta de owner por Google/Facebook segun policy global | Owner / Sistema | Alta |
| FR-078 | Configuracion global de planes de plataforma | Alta/edicion/publicacion de planes comerciales de NILA | Administrador global | Alta |
| FR-079 | Asignacion de plan a organizacion | Asignar plan de plataforma y estado de suscripcion por empresa | Administrador global | Alta |

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
| FR-071D | Check-in por QR en establecimiento | El alumno presenta/escanea su codigo QR al ingresar y el sistema registra asistencia con fecha, hora y sede | Alumno / Sistema | Alta |
| FR-071E | Puntuacion de establecimientos o sucursales | Alumno puede calificar la experiencia del centro o sucursal donde toma servicios | Alumno | Media |

## 5.5 Clases
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-014 | Crear clase | Alta de clase en calendario | Instructor | Alta |
| FR-015 | Definir capacidad de clase | Capacidad <= capacidad del salon | Instructor | Alta |
| FR-016 | Asignar instructor | Asignar instructor responsable | Owner | Alta |
| FR-017 | Definir horario de clase | Fecha/hora de inicio y fin | Instructor | Alta |
| FR-018 | Cancelar clase | Cancelar clase programada | Instructor | Media |
| FR-018A | Evitar solapamientos | Evitar choque de salon o instructor en el mismo rango horario | Sistema | Alta |

## 5.6 Instructores y costo operativo
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-080 | Alta de instructor | Crear usuario instructor con acceso operativo | Owner | Alta |
| FR-081 | Configurar esquema de liquidacion | Definir pago por hora, mensual, por clase o mixto | Owner | Alta |
| FR-082 | Medir horas y clases por instructor | Calcular actividad mensual desde clases asignadas | Sistema | Alta |
| FR-083 | Liquidacion mensual de instructores | Generar resumen, monto y estado pagado/pendiente | Owner | Alta |

## 5.7 Pagos y finanzas
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-023 | Integracion MercadoPago | Flujo de checkout por pago | Sistema | Alta |
| FR-024 | Pago de clases | Pago de clase individual | Alumno | Alta |
| FR-025 | Pago de membresias | Pago de plan de membresia | Alumno | Alta |
| FR-026 | Registro automatico de pagos | Actualizar estado por webhook/manual | Sistema | Alta |
| FR-027 | Historial de pagos | Visualizar pagos por perfil | Admin / Owner / Alumno | Alta |
| FR-027A | Facturacion electronica (ARCA) | Emision de comprobantes sobre pagos aprobados | Sistema | Alta |
| FR-027B | Pago en efectivo de suscripciones de alumnos | Registrar y gestionar pagos de membresias/suscripciones de alumnos cobrados en efectivo en el establecimiento | Owner / Sistema | Alta |
| FR-084 | Cobro de suscripcion de plataforma | Generar solicitud de pago owner por plan de NILA | Owner | Alta |
| FR-085 | Trial de plataforma visible | Mostrar estado y tiempo restante del trial en portal owner | Sistema | Alta |

## 5.8 Suscripciones comerciales del owner
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-086 | Configurar planes para clientes | Owner define planes comerciales para sus alumnos | Owner | Alta |
| FR-087 | Exponer atributos del plan comercial | Precio, moneda, vigencia, descripcion y clases por semana | Owner | Alta |
| FR-089 | Configurar paleta visual del marketplace | Owner define colores de marca aplicables a su presencia publica en marketplace | Owner | Media |
| FR-090 | Pagina de marca y servicios del establecimiento | Owner administra una pagina publica con branding, propuesta comercial y servicios ofrecidos | Owner | Alta |

## 5.9 Marketplace publico y marketing
| ID | Requerimiento | Descripcion | Actor | Prioridad |
|---|---|---|---|---|
| FR-071 | Descubrir centros sin login | Busqueda publica de centros por nombre/ciudad/direccion | Publico | Alta |
| FR-072 | Geolocalizacion de cercania | Ordenar centros por cercania usando geolocalizacion del dispositivo | Sistema | Alta |
| FR-073 | Mapa interactivo de centros | Mostrar marcadores de sucursales y seleccion por mapa | Publico | Alta |
| FR-074 | Navegacion a Google Maps | Abrir "como llegar" y mapa externo del centro seleccionado | Publico | Alta |
| FR-075 | Seccion Quienes somos | Landing publica informativa | Publico | Media |
| FR-076 | Seccion Precios y planes | Landing publica comercial | Publico | Media |
| FR-088 | Publicacion de planes de plataforma | Mostrar en web solo planes activos/publicos definidos por admin | Sistema / Publico | Alta |
| FR-091 | Branding publico por establecimiento | El marketplace refleja colores, imagenes y contenido comercial definidos por cada owner | Sistema / Publico | Media |
| FR-092 | Visibilidad publica de reputacion | Mostrar puntuacion promedio y volumen de calificaciones de establecimientos o sucursales | Sistema / Publico | Media |

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
| RNF-035 | Configuracion frontend portable | URL de API y credenciales publicas configurables en runtime |

## 7. Reglas de negocio clave
- Un owner solo puede crear una empresa.
- Solo admin puede modificar habilitaciones globales de plataforma (SSO, modulos por plan, suscripciones).
- Un alumno puede pertenecer a multiples organizaciones.
- La asistencia del alumno puede registrarse mediante codigo QR al ingresar al establecimiento.
- Cada owner puede personalizar la presencia publica de su empresa con paleta visual, branding y servicios ofrecidos.
- Las calificaciones de alumnos se registran por establecimiento o sucursal y deben quedar asociadas a una experiencia real del centro.
- Razon social se bloquea cuando existe emision fiscal.
- Capacidad de clase no puede superar capacidad de salon.
- Salon bloqueado o con conflicto horario no se puede asignar a clase.
- Un plan de plataforma puede ser visible en web sin permitir alta autogestionada.
- La liquidacion de instructores depende del esquema economico configurado por empresa.
- Las suscripciones de alumnos pueden abonarse por medios digitales o en efectivo segun la operacion del establecimiento.

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
- Infra: Docker Compose, ECR, ECS/Fargate, EC2.
- Repositorio: GitHub.

## 10. Brand System NILA

### 10.1 Nucleo de marca
- Marca: `NILA`
- Descriptor: `Gestion premium para estudios de pilates`
- Idea central: ordenar la operacion del estudio y elevar su imagen comercial.

### 10.2 Posicionamiento
`NILA es la plataforma premium de gestion para estudios de pilates que combina operacion, experiencia y crecimiento comercial.`

Version corta:
`NILA, gestion premium para estudios de pilates.`

### 10.3 Atributos de marca
- premium
- serena
- precisa
- profesional
- contemporanea
- confiable

### 10.4 Sistema verbal
- Tagline principal: `Gestion premium para estudios de pilates`
- Tagline alternativo: `Operacion, alumnos y cobros en una sola plataforma`
- Propuesta corta: `NILA ayuda a estudios de pilates a gestionar mejor su negocio y su presencia digital.`

### 10.5 Paleta visual
Colores primarios:
- `Navy Deep` `#191E3B`
- `Ivory Mist` `#F7F4EE`

Colores secundarios:
- `Slate` `#647089`
- `Cloud` `#E9EDF3`

Acentos:
- `Champagne` `#C8A97E`
- `Soft Sage` `#9FB7A3`

Estados de interfaz:
- `Success` `#2F7D62`
- `Warning` `#B9852A`
- `Error` `#B24A4A`

### 10.6 Tipografia
Editorial / marca:
- `Cormorant Garamond`

Producto / UI:
- `Manrope`

Fallbacks:
- `Georgia`
- `system-ui, sans-serif`

### 10.7 Direccion visual
La marca debe transmitir:
- lujo sobrio
- bienestar moderno
- tecnologia silenciosa
- claridad operativa

Principios de aplicacion:
- mucho aire visual
- pocos colores bien usados
- interfaces limpias y jerarquicas
- imagenes aspiracionales sin verse artificiales

### 10.8 Iconografia y componentes
Iconografia:
- linea fina
- geometria simple
- consistencia de trazo

Componentes:
- boton primario oscuro con contraste alto
- cards claras con borde suave y sombra contenida
- inputs limpios con foco sobrio
- badges discretos para estados

### 10.9 Tono de voz
La comunicacion de NILA debe ser:
- clara
- breve
- segura
- elegante
- comercial sin exageracion

### 10.10 Aplicaciones prioritarias
La identidad debe reflejarse primero en:
1. Landing publica
2. Header y hero principal
3. Login y registro
4. Portal owner
5. Marketplace y fichas de estudios
6. Emails y mensajes transaccionales

## 11. Criterio de cierre (Definition of Done documental)
Se considera cubierta la documentacion base cuando existen y estan actualizados:
- `docs/documento-tecnico.md`
- `docs/manual-desarrollador.md`
- `docs/manual-usuario.md`
- `docs/manual-tecnico.md`
- `docs/manual-instalacion.md`
- `docs/manual-aws.md`
- `docs/arquitectura.md`
- `docs/README.md`
