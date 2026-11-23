# ADR 003: Aislamiento multi-tenant por negocio y membresías

## Estado

Implementado en código y en la migración
`backend/supabase/migrations/20261117180000_business_memberships_and_roles.sql`.
La migración no se ha aplicado en Supabase; el aislamiento multi-tenant no se considera
activo en ningún entorno hasta aplicar y validar ese cambio.

## Contexto

La aplicación autentica personas con Supabase Auth, pero hoy las tablas operativas
(`wash_jobs`, `washers`, `service_prices` y `addons`) representan la propiedad y las
políticas RLS con `user_id = auth.uid()`. Por tanto, dos cuentas no comparten de forma
segura un mismo autolavado. Los trabajos guardan `washer_name` como texto, sin una
asignación relacional que permita limitar el acceso de un lavador. La trazabilidad y las
adiciones por trabajo ya existen, pero también deben respetar el tenant del trabajo.

La presentación es React; los hooks/casos de uso están en `application/`, los
repositorios de Supabase en `data/`, el dominio en `domain/` y los tipos/cliente en
`infrastructure/supabase/`. Esta separación debe mantenerse.

## Decisión

Adoptar un modelo multi-tenant donde `business_id` define la propiedad de los datos,
`business_memberships` autoriza a cada cuenta en un negocio y `washer_id` asigna cada
trabajo a un lavador. Una cuenta puede pertenecer a varios negocios, incluso con roles
diferentes; el negocio activo seleccionado en el frontend mejora la navegación, pero
**no es una frontera de seguridad**. Las consultas y las escrituras siempre se vuelven a
autorizar en PostgreSQL/RLS.

### Modelo de tablas

El siguiente modelo se materializa en la migración indicada arriba. Los campos
`business_id` se rellenan a partir de los propietarios legacy; los lavados con una
coincidencia única de nombre se relacionan con un `washer_id`.

| Tabla | Campos/relaciones principales | Propósito y restricciones |
|---|---|---|
| `profiles` | `id uuid PK REFERENCES auth.users`, `display_name`, marcas de tiempo | Perfil de aplicación. No duplica contraseñas ni tokens; el email sigue en Supabase Auth. |
| `businesses` | `id uuid PK`, `name`, `created_by_user_id`, `created_at`, `status` | Tenant. El creador queda como primer miembro `admin`; no se usa el nombre para autorizar. |
| `business_memberships` | `id uuid PK`, `business_id FK`, `user_id FK NULL mientras la invitación esté pendiente`, `invited_email NULL`, `role`, `status`, `invited_by_user_id`, fechas | Relaciona cuenta y negocio. `role CHECK IN ('admin','washer')`; `status CHECK IN ('invited','active','suspended')`. Índice único parcial por `(business_id,user_id)` cuando `user_id IS NOT NULL`; índice único parcial por email de invitación pendiente normalizado. Una membresía sin cuenta asociada no concede acceso. |
| `washers` | `id uuid PK`, `business_id FK`, `membership_id NULL UNIQUE`, `name`, `qr_token`, `active`, marcas de tiempo | Perfil operativo/QR del lavador dentro de un negocio. `membership_id` apunta a una membresía `washer` del mismo negocio; puede enlazarse a una invitación pendiente o quedar nulo si todavía no existe una membresía. El QR identifica, pero no concede autorización. |
| `wash_jobs` | columnas actuales; `business_id NOT NULL`, `washer_id NULL`, `created_by_user_id`, `washer_name` como snapshot | El trabajo pertenece a un negocio y opcionalmente a un lavador. FK compuesta `(washer_id,business_id) → washers(id,business_id)` impide asignar un lavador de otro negocio. `washer_name` se conserva para el histórico. El actual `user_id` se mantiene transitoriamente como dato de auditoría/compatibilidad, no como clave de tenant. |
| `service_prices` | columnas actuales; `business_id NOT NULL`, `created_by_user_id` | Catálogo compartido por los administradores del negocio. La unicidad pasa a `(business_id,car_type,wash_type)`. |
| `addons` | columnas actuales; `business_id NOT NULL`, `created_by_user_id` | Catálogo de adiciones del negocio. |
| `wash_job_addons` | columnas actuales: `wash_job_id`, `addon_id`, `addon_name_snapshot`, `price_snapshot` | Sigue perteneciendo al lavado; acceso RLS derivado del `business_id` y asignación del trabajo padre. Los snapshots preservan el histórico. |
| `wash_job_status_history` | columnas actuales, `actor_user_id` (migrado desde el `user_id` actual) | Auditoría del actor. Acceso RLS derivado del lavado asociado; `actor_user_id` no concede acceso por sí mismo. |

`business_memberships` debe tener `UNIQUE (id,business_id)` para que `washers` pueda
referenciar membresía y negocio juntos. Debe haber también `UNIQUE (id,business_id)` en
`washers` para la FK compuesta de `wash_jobs`. Un constraint trigger o RPC validará que
`washers.membership_id` corresponda a una membresía activa/invitada con rol `washer` y el
mismo `business_id`; un lavador no puede estar vinculado a perfiles de otro negocio.

La política para invitaciones pendientes requiere una operación restringida que
verifique la identidad autenticada y el email verificado antes de activar la membresía.
Nunca se confía en un `user_id`, un `business_id`, un email o un rol enviados por el
navegador sin validación en servidor/DB.

### Reglas RLS esperadas por rol

Todas las tablas con tenant deben tener RLS habilitado. Las condiciones se basan en
membresías `active`; una membresía `invited` o `suspended` no autoriza ninguna operación.
Las políticas siempre correlacionan el mismo `business_id`.

Para evitar recursión entre políticas de `business_memberships`, se propone usar helpers
pequeños como `is_active_business_member(business_id)`,
`has_business_role(business_id, role)` e `is_assigned_washer(business_id, washer_id)`.
Si son `SECURITY DEFINER`, deben usar `search_path` fijo, derivar el usuario exclusivamente
de `auth.uid()` (sin parámetro `user_id` arbitrario), devolver solo booleanos y limitar
`EXECUTE` a `authenticated`. No deben exponer filas de membresía.

| Recurso | Admin activo del negocio | Lavador activo del negocio |
|---|---|---|
| `businesses` | Leer/actualizar el negocio donde administra | Leer el negocio del que es miembro, solo para contexto |
| `profiles` | Leer `display_name` de miembros de sus negocios; no enumerar `auth.users` ni acceder a contraseñas | Leer/actualizar su propio perfil |
| `business_memberships` | Leer miembros de su negocio; invitar, suspender y administrar membresías de lavadores mediante operación validada | Leer sus propias membresías activas; no insertar, alterar su rol ni activarse |
| `washers` | CRUD de perfiles/QR del mismo negocio y gestionar el vínculo de membresía | Leer únicamente el perfil de lavador vinculado a su propia membresía |
| `service_prices`, `addons` | CRUD dentro del negocio | Sin acceso al catálogo de administración, salvo que un caso de uso futuro requiera lectura acotada |
| `wash_jobs` | Leer/crear/actualizar/eliminar trabajos del negocio, con `washer_id` nulo o de su propio negocio | Leer solo trabajos cuyo `washer_id` corresponda a su perfil de lavador |
| `wash_job_addons`, `wash_job_status_history` | Leer registros de trabajos del negocio; escrituras solo mediante RPCs/triggers de confianza | Leer únicamente registros de trabajos asignados; no editar ni borrar snapshots/auditoría |

El lavador no recibe una política de `UPDATE` general sobre `wash_jobs`, ya que RLS por
fila no limita qué columnas puede cambiar. El progreso se actualiza exclusivamente por
una RPC estrecha que verifica membresía activa, rol `washer`, asignación al trabajo,
transición siguiente permitida y negocio coincidente. La RPC no acepta cambios de precio,
vehículo, negocio ni asignación. Los administradores pueden usar operaciones de escritura
limitadas al negocio. La creación del negocio y la primera membresía `admin` también se
hacen en una operación de confianza que fija `auth.uid()` como creador.

Las políticas actuales de “mis filas por `user_id`” son permisivas y PostgreSQL combina
políticas permisivas con OR. No basta con agregar políticas nuevas: en el cutover se
deben reemplazar las políticas antiguas para que no permitan acceso por fuera de las
nuevas reglas de negocio/asignación.

### Plan de migración SQL no destructivo

Este plan describe la estrategia implementada en la migración versionada. El archivo SQL
es ejecutable, pero **todavía no se ha aplicado en Supabase**. No se modifican las
migraciones existentes y no se eliminan filas ni columnas durante el backfill.

1. **Inventario y respaldo.** Respaldar la base, contar filas por tabla y enumerar los
   `user_id` presentes en `wash_jobs`, `washers`, `service_prices` y `addons`. Preparar y
   aprobar un mapa explícito entre cuentas y negocios. No inferir que dos cuentas son el
   mismo negocio solo porque tengan nombres de lavador similares.
2. **Crear el modelo nuevo.** En una nueva migración fechada, crear `profiles`,
   `businesses` y `business_memberships`, más sus índices/constraints. Crear funciones
   de bootstrap e invitación restringidas, sin permitir autoasignación de `admin`.
3. **Expandir columnas, aún nullable.** Añadir `business_id` a `wash_jobs`, `washers`,
   `service_prices` y `addons`; añadir `washer_id` y `created_by_user_id` a `wash_jobs`;
   añadir `membership_id` a `washers` y `actor_user_id` a la auditoría. Mantener intactos
   los antiguos `user_id`, `washer_name`, QR tokens y precios.
4. **Backfill revisable.** Poblar perfiles desde los IDs de `auth.users` (solo metadatos
   de presentación necesarios). Crear un negocio y membresía `admin` inicial por cada
   cuenta propietaria identificada, salvo agrupaciones de negocio aprobadas
   explícitamente. Copiar el `business_id` según el mapa y copiar el antiguo `user_id` a
   `created_by_user_id`/`actor_user_id`. Convertir filas `washers` existentes en perfiles
   del negocio, inicialmente sin membresía autenticada.
5. **Asignaciones sin conjeturas.** Asociar `wash_jobs.washer_id` solo cuando
   `washer_name` encuentre exactamente un `washers.name` en el mismo negocio. Para
   nombres ausentes o duplicados, dejar `washer_id NULL`, preservar `washer_name` y
   generar un informe para reasignación manual. No otorgar a ningún lavador acceso por
   coincidencia aproximada.
6. **Validar antes de endurecer.** Verificar que todas las filas tenant tengan negocio,
   que no haya FKs cruzadas, membresías duplicadas ni asignaciones a roles distintos de
   `washer`. Crear índices por `(business_id,...)`, FKs compuestas `NOT VALID` y
   validarlas después de resolver errores. Solo entonces convertir `business_id` a
   `NOT NULL` en las tablas operativas.
7. **Cutover coordinado.** Desplegar la versión frontend compatible y hacer una ventana
   corta de mantenimiento. En una transacción de cutover, habilitar/verificar RLS,
   instalar las políticas finales y retirar las políticas antiguas por `user_id`.
   Cambiar los repositorios/RPCs para usar `business_id` y `washer_id`; actualizar la RPC
   de creación de lavado/adiciones para comprobar rol y negocio. Reanudar escrituras y
   habilitar el selector de negocio/controles por rol.
8. **Retención y retirada posterior.** Mantener los campos `user_id` originales, el mapa
   de backfill y reportes de filas sin asignación durante el periodo de observación.
   Tras validar métricas, respaldos y compatibilidad, planear en otro ADR la retirada
   eventual de campos obsoletos; no eliminarlos como parte de esta migración.

Cada fase de esquema debe tener una migración SQL nueva, ordenada y revisable. Antes del
cutover, probar las políticas en un proyecto de staging con consultas bajo los roles
`authenticated` de ambos negocios, admin, lavador asignado, lavador no asignado y usuario
suspendido. Para volver atrás, conservar columnas/datos legacy y despliegues identificados.
Si ya se crearon datos compartidos, no reactivar políticas antiguas sin comprobar que no
abren acceso entre tenants; en ese caso es más seguro corregir hacia delante.

### Archivos frontend relacionados

La siguiente lista documenta el alcance frontend de esta decisión, no una lista de tareas
pendientes. La implementación ya contempla el contexto de negocio/rol, repositorios,
hooks y controles de presentación. La migración de base de datos debe aplicarse antes de
desplegar esa versión.

| Capa | Archivos |
|---|---|
| `infrastructure` | `frontend/src/infrastructure/supabase/types.ts` — tipos de tablas, enums/checks y RPCs nuevos. |
| `domain` | `frontend/src/domain/entities/wash-job.entity.ts`, `washer.entity.ts`, `addon.entity.ts`, `service-price.entity.ts`; entidades nuevas `business.entity.ts`, `profile.entity.ts`, `business-membership.entity.ts`; enums/reglas/validadores nuevos para rol, membresía y negocio. |
| `data` | `frontend/src/data/repositories/auth.repository.ts`; `wash-jobs.repository.ts`, `washers.repository.ts`, `service-prices.repository.ts`, `addons.repository.ts`; repositorios nuevos de negocios, perfiles y membresías. Cada llamada deberá recibir/derivar el contexto de negocio autorizado. |
| `application` | `useAuthSession.ts` y hooks de lavado (`useWashJobs.ts`, `useMonthlyWashJobs.ts`, `useCreateWashJob.ts`, `useQuickCreateWashJob.ts`), lavadores (`useWashers.ts`, `useWasherByToken.ts`), precios (`useServicePrices.ts`) y adiciones (`useAddons.ts`). Añadir hooks de membresía/negocio activo y capacidades por rol. |
| `presentation` | `frontend/src/App.tsx`, `pages/Auth.tsx`, `pages/Dashboard.tsx`; `ConfigPanel.tsx`, `WashersAdmin.tsx`, `ServicePricesAdmin.tsx`, `AddonsAdmin.tsx`; `NewWashDialog.tsx`, `ScanWashDialog.tsx`, `KanbanBoard.tsx`, `WashCard.tsx`, `WashHistory.tsx`, `WasherStats.tsx`. Mostrar selector/contexto de negocio, ocultar administración al lavador y limitar tablero a trabajos asignados. Añadir una guarda de ruta/rol en el router y/o Dashboard. |
| Pruebas | Pruebas de dominio para capacidades y transiciones, pruebas de repositorios/RPC y pruebas de integración RLS con dos negocios y roles distintos. |

La presentación seguirá sin importar Supabase. Los filtros `business_id` en hooks/repositorios
son para UX/rendimiento, nunca reemplazan RLS. Los QR existentes tampoco sustituyen login ni
membresía activa.

## Alternativas consideradas

- **Mantener `user_id` como tenant y compartir credenciales:** rechazado; no permite
  separación de roles, auditoría individual ni revocación segura de un lavador.
- **Filtrar solo en frontend por negocio/rol:** rechazado; el cliente puede modificar
  filtros y llamar directamente a Supabase.
- **Guardar solo `washer_name` en `wash_jobs`:** rechazado; no permite demostrar
  asignación, controlar cambios de progreso ni aplicar RLS a los trabajos de un lavador.
- **Una tabla global de roles por usuario:** rechazada; no representa que una cuenta pueda
  ser admin en un negocio y lavador en otro. El rol pertenece a la membresía.

## Riesgos y estrategia sobre datos existentes

- **Agrupación de cuentas:** una cuenta histórica no siempre equivale a una empresa física.
  Crear inicialmente un negocio por propietario de datos y solicitar aprobación explícita
  antes de unir cuentas evita mezclar tenants accidentalmente.
- **Asignación de trabajos legacy:** `washer_name` es texto libre; puede haber variantes o
  duplicados. Las coincidencias ambiguas quedan sin `washer_id` y accesibles solo a admins
  hasta su revisión.
- **Políticas RLS antiguas:** al ser permisivas, coexisten por OR con las nuevas. Deben
  reemplazarse en el cutover y comprobarse con pruebas negativas entre dos negocios.
- **Inserciones directas y RPCs:** las operaciones deben verificar membresía y rol en DB.
  No se incorpora `service_role` al frontend ni se acepta un negocio elegido por el cliente
  sin validación. Los triggers de historia/snapshots deben conservar el actor, el negocio y
  la asignación.
- **Invitaciones y datos personales:** una invitación pendiente no autoriza acceso. La
  activación debe comprobar identidad/email verificado en una función de confianza; no se
  enumera `auth.users` desde el navegador ni se confía en un QR como credencial.
- **Compatibilidad y rollback:** mantener columnas y datos antiguos evita una migración
  destructiva, pero una vez compartidos datos entre cuentas no es seguro volver sin más a
  RLS por `user_id`. Respaldo, staging, ventana de cutover y reversión hacia delante son
  requisitos.
- **Revocación:** suspender una membresía debe retirar acceso inmediatamente, incluso si
  la sesión Supabase sigue vigente. Las políticas/helpers consultan el estado actual en DB,
  no un rol guardado en local storage o metadatos editables por el cliente.

## Consecuencias

Se obtiene aislamiento por negocio, roles contextuales y asignación verificable de
trabajos a lavadores, manteniendo las cuentas individuales de Supabase Auth y los
históricos. La solución requiere un cambio coordinado de esquema, RLS, RPCs y frontend,
más un proceso explícito para mapear datos legacy. La decisión deja la pertenencia y las
relaciones expresadas con claves UUID para futuras extensiones, sin incorporar Jena, RDF
ni una integración semántica ahora.
