# Metodología oficial — Autolavado Express El Chorro

## Metodología acordada

El proyecto utiliza **Scrum adaptado**, de acuerdo con el marco de la asignatura
documentado por el equipo. El Product Backlog, los incrementos de producto, la revisión
de resultados y la retrospectiva son sus prácticas de referencia. Los cambios se
agruparon retrospectivamente en incrementos; esta documentación no afirma que se
realizaran sprints de duración fija ni ceremonias que no estén registradas.

Los **Architecture Decision Records (ADR)** son artefactos para conservar el contexto,
la decisión y sus consecuencias técnicas. Complementan Scrum y no constituyen una
metodología adicional. Los ADR vigentes están en [`docs/adr/`](docs/adr/).

En un equipo reducido, las responsabilidades pueden recaer en las mismas personas:

- **Product Owner:** mantiene y prioriza el Product Backlog.
- **Equipo de desarrollo:** implementa, prueba y documenta incrementos.
- **Scrum Master:** facilita el proceso adaptado y registra impedimentos/mejoras.

## Product Backlog

Esta tabla es el backlog oficial único del proyecto.

| ID | Historia / necesidad | Estado |
|---|---|---|
| HU01 | Como persona usuaria, quiero registrarme e iniciar sesión para acceder a las funciones permitidas por mi membresía. | Hecho |
| HU02 | Como persona usuaria, quiero recuperar mi contraseña por correo para restablecer el acceso. | Hecho |
| HU03 | Como administrador, quiero crear un lavado manualmente o mediante el flujo QR para registrar vehículos y asignar lavadores. | Hecho |
| HU04 | Como miembro autorizado, quiero consultar el tablero Kanban para ver los trabajos permitidos. | Hecho |
| HU05 | Como miembro autorizado, quiero avanzar un lavado solo por `pending` → `in_progress` → `completed` → `delivered`. | Hecho |
| HU06 | Como administrador, quiero consultar estadísticas por lavador y el reparto 60/40 para revisar los ingresos. | Hecho |
| HU07 | Como miembro autorizado, quiero consultar el historial mensual, las adiciones y la trazabilidad de estados de los lavados permitidos. | Hecho |
| HU08 | Como equipo, queremos separar dominio, datos, aplicación, infraestructura y presentación para mantener las responsabilidades claras. | Hecho |
| HU09 | Como equipo, queremos gestionar la persistencia y autenticación con el proyecto Supabase propio. | Hecho |
| HU10 | Como equipo, queremos integrar Jena/Fuseki o una capa semántica. | Diferido; fuera del alcance actual |
| HU11 | Como administrador, quiero mantener tarifas por vehículo/tipo de lavado y administrar el catálogo de adiciones. | Hecho |
| HU12 | Como equipo, queremos persistir las adiciones elegidas y guardar snapshots históricos con el trabajo. | Hecho en código y migración |
| HU13 | Como negocio, queremos cuentas admin/lavador, membresías y aislamiento de datos por negocio. | Implementado en código/migración; aplicación de migración pendiente en Supabase |
| HU14 | Como equipo, queremos pruebas unitarias para reglas, validadores y estadísticas, además de un registro reproducible de verificación. | Hecho; lint global conserva errores en archivos no modificados |

La prioridad se decide por valor para la operación, riesgo de seguridad/datos y
dependencias técnicas. Las historias con estado de despliegue pendiente no se consideran
disponibles en producción hasta ejecutar y verificar la migración correspondiente.

## Incrementos de trabajo

Los siguientes bloques resumen el historial conocido del proyecto; no representan una
duración o calendario presunto:

1. **Arquitectura e independencia:** separar las cinco capas, centralizar reglas y usar
   Supabase propio.
2. **Flujo operativo:** autenticación, creación de lavados, tablero, tarifas, QR e
   historial/estadísticas.
3. **Estados e historial:** añadir `delivered`, validar transiciones y guardar eventos de
   estado desde la base de datos.
4. **Adiciones por lavado:** persistir catálogo seleccionado, snapshots de nombre/precio
   y total calculado de forma atómica.
5. **Negocios y membresías:** definir aislamiento multi-tenant, roles admin/lavador y
   compatibilidad de datos existentes. La migración SQL está versionada, pero su
   aplicación en Supabase sigue pendiente.
6. **Calidad y documentación:** ampliar pruebas unitarias, revisar límites de capas y
   registrar resultados de TypeScript, lint, tests y build.

## Acuerdos de trabajo

- Los cambios de esquema se agregan en migraciones nuevas y fechadas; no se reescriben
  migraciones aplicadas.
- Las reglas puras se mantienen en `domain/` y se prueban sin conexión a Supabase.
- La presentación consume hooks/casos de uso y no importa repositorios ni el cliente
  Supabase directamente.
- RLS y validaciones en PostgreSQL son la autoridad de acceso; los filtros del frontend
  son auxiliares, no controles de seguridad.
- No guardar secretos ni archivos `.env` en documentación, pruebas o código versionado.
- Jena, Fuseki e integración semántica permanecen diferidos.

## Definition of Done y verificación

La definición de terminado está en [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md).
Cada entrega debe registrar comandos y resultados reales en `docs/verification/`.
