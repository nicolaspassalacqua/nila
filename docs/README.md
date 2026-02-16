# Documentacion NILA

Este directorio concentra la documentacion viva del producto y del MVP.

## Indice principal
- `manual-instalacion.md`: instalacion local y con Docker.
- `manual-desarrollador.md`: guia para desarrolladores (backend/frontend/flujo).
- `documento-tecnico.md`: especificacion tecnica del MVP (modulos, API, datos, seguridad).
- `arquitectura.md`: arquitectura funcional y tecnica, decisiones y escalabilidad.`r`n- `arquitectura-conexion-logica.md`: diagramas graficos de conexion logica entre componentes.
- `manual-usuario.md`: manual funcional para usuario cliente y profesional.
- `registro-cambios.md`: bitacora de cambios de documentacion y producto.
- `mvp-inicio.md`: alcance inicial del MVP.
- `mvp-runbook.md`: pasos rapidos de validacion del MVP.

## Regla de mantenimiento (obligatoria)
Cada vez que se agregue, cambie o elimine funcionalidad:
1. Actualizar `documento-tecnico.md` (modulo/API/modelo afectado).
2. Actualizar `manual-usuario.md` si cambia experiencia de uso.
3. Actualizar `manual-desarrollador.md` si cambia flujo de trabajo.
4. Agregar entrada en `registro-cambios.md` con fecha y alcance.

## Convencion de versionado documental
- Estado actual: `MVP 1.0-alpha`.
- Version de docs: `docs-v1`.
- Formato de entradas en registro: `YYYY-MM-DD | area | resumen | archivo(s)`.

