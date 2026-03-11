# Manual de Usuario - NILA
Version: `1.0`
Fecha: `2026-03-11`

## 1. Introduccion
NILA tiene 4 experiencias de uso:
- Portal publico (sin login)
- Portal administrador global
- Portal owner
- Portal alumno

## 2. Portal publico
URL principal: `/login`

Menu superior:
- Quienes somos
- Precios y planes
- Login empresas
- Login alumnos
- Buscar tu centro mas cercano

## 3. Descubrir centros (publico)
URL: `/descubrir-centros`

Funciones:
1. Buscar por nombre, ciudad o direccion.
2. Usar geolocalizacion para ordenar por cercania.
3. Ver centros en mapa interactivo.
4. Seleccionar un centro desde tarjeta o marcador.
5. Abrir Google Maps:
   - `Como llegar`
   - `Abrir en Google Maps`
6. Iniciar registro en empresa seleccionada.

## 4. Login y registro de alumno
Opciones:
- Usuario + contrasena
- Google SSO (si esta habilitado)
- Facebook SSO (si esta habilitado)

Registro marketplace:
- Seleccionar empresa
- Cargar datos personales
- Crear cuenta

Resultado:
- Se crea usuario del sistema.
- Se crea perfil de alumno en la empresa seleccionada.

## 5. Portal administrador global
Funciones principales:
- Gestion de usuarios (crear, editar, eliminar)
- Asignacion de roles
- Reset de contrasena
- Alta/baja de owner en organizaciones
- Configuracion SSO Google/Facebook
- Activar/desactivar organizaciones
- Configurar suscripcion y modulos habilitados por organizacion
- Ver resumen global y pagos

Buenas practicas admin:
- No eliminar usuario activo sin validar impacto.
- Mantener un segundo admin de respaldo.
- Habilitar SSO solo con credenciales validas.

## 6. Portal owner
Funciones principales:
- Gestion de empresa (datos fiscales/comerciales)
- Alta/edicion/eliminacion de sedes
- Configuracion de horarios semanales por sede
- Alta/edicion/bloqueo de salones
- Gestion de alumnos y su historial
- Gestion de clases
- Gestion de planes, pagos y comprobantes

Reglas importantes:
- Solo una empresa por owner.
- Si hay documento fiscal emitido, no se puede cambiar razon social.
- Los modulos visibles dependen de lo habilitado por admin global.

## 7. Portal alumno
Funciones principales:
- Ver perfiles asociados por empresa
- Asociarse a nuevas empresas del marketplace
- Ver y realizar pagos de clases/membresias
- Consultar estado de pagos y link de checkout

## 8. Flujo recomendado (owner)
1. Crear empresa
2. Crear sedes
3. Definir horarios de sedes
4. Crear salones por sede
5. Cargar alumnos
6. Crear clases
7. Configurar planes y cobros
8. Emitir comprobantes cuando corresponda

## 9. Preguntas frecuentes
### No puedo ingresar con Google/Facebook
- Verificar si el admin global habilito SSO.
- Verificar que la cuenta comparta email.

### No me deja guardar una clase
- Revisar que inicio/fin sean correctos.
- Verificar capacidad de clase <= capacidad de salon.
- Verificar que no haya solapamiento de horario.

### No puedo editar razon social
- La empresa tiene marcado documento fiscal emitido.

### No aparece mi empresa en marketplace
- Debe estar activa y con suscripcion habilitada.

## 10. Soporte operativo
Cuando reportes un problema, incluir:
- Portal y usuario afectado
- Fecha y hora
- Pantalla (captura)
- Mensaje de error exacto
- Pasos para reproducir
