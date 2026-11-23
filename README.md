# Autolavado Express El Chorro

Sistema de gestión para un autolavado, con un tablero Kanban para dar seguimiento a los
trabajos de lavado, estadísticas por lavador e historial mensual de ingresos.

Proyecto universitario desarrollado con **Scrum adaptado**. Los ADR son registros de
decisiones técnicas que complementan la metodología, no una metodología paralela.

## Tecnologías

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (componentes sobre Radix UI)
- [Supabase](https://supabase.com/) (base de datos Postgres, autenticación y Row Level Security)
- [React Query](https://tanstack.com/query), [React Router](https://reactrouter.com/), [Zod](https://zod.dev/), [Vitest](https://vitest.dev/)

## Arquitectura de 5 capas

El código de `frontend/src/` está organizado en cinco capas con responsabilidades separadas.
La regla que se respeta en todo el proyecto es: **la capa de Presentación no importa
Supabase ni repositorios directamente**; llama a la capa de Aplicación, que coordina con
Datos.

```
frontend/src/
├── domain/            # Reglas de negocio puras (sin React, sin Supabase)
│   ├── entities/         → forma de los datos del negocio (WashJob)
│   ├── enums/            → estados posibles (WashStatus) y sus etiquetas
│   ├── rules/            → transiciones de estado válidas, reparto de ganancias
│   └── validators/       → esquemas Zod de validación (formularios)
│
├── data/              # Persistencia: el único lugar que conoce Supabase
│   └── repositories/     → acceso a Supabase; auth.repository.ts, wash-jobs.repository.ts, etc.
│
├── application/       # Casos de uso: conectan dominio + datos, exponen hooks a la UI
│   ├── hooks/            → useWashJobs, useMonthlyWashJobs, useCreateWashJob, useAuthSession
│   └── services/         → wash-stats.service.ts, auth.service.ts
│
├── infrastructure/    # Arranque técnico y configuración externa
│   └── supabase/         → client.ts (cliente de Supabase), types.ts (tipos generados)
│
└── presentation/      # UI: páginas y componentes, sin lógica de negocio
    ├── pages/            → Index, Auth, Dashboard, ResetPassword, NotFound
    ├── components/       → KanbanBoard, WashCard, NewWashDialog, WashHistory, WasherStats, NavLink
    └── ui/               → primitivos de shadcn/ui (botones, cards, tablas, diálogos…)
```

Utilidades transversales que no pertenecen a ninguna capa de negocio en particular
(el kit de UI de shadcn) se mantienen en `frontend/src/lib/utils.ts` y `frontend/src/hooks/` (toasts,
detección de mobile), tal como las genera shadcn/ui.

### Flujo de una acción, de punta a punta

Ejemplo — mover una tarjeta del tablero Kanban de "Completado" a "Entregado":

1. **Presentación** (`KanbanBoard.tsx`) ofrece únicamente la transición siguiente: `completed` → `delivered`.
2. **Aplicación** (`useWashJobs.ts`) valida que el estado destino sea el siguiente permitido y orquesta la actualización local.
3. **Datos** (`wash-jobs.repository.ts`) llama la RPC de avance de estado.
4. **Infraestructura** (`infrastructure/supabase/client.ts`) es el cliente que habla con Supabase.
5. **Dominio** (`domain/rules/wash-status.rules.ts`) define el flujo ordenado `pending` → `in_progress` → `completed` → `delivered`; no permite saltos ni retrocesos.

## Base de datos (Supabase)

El modelo relacional tiene `wash_jobs` como entidad central, con tablas de apoyo para
lavadores, precios, adiciones y trazabilidad (ver migraciones en `backend/supabase/migrations/`):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | Clave primaria, autogenerada |
| `user_id` | `uuid` | Identidad histórica de creación; RLS se decide por membresía de negocio |
| `business_id` | `uuid` | Negocio propietario del trabajo |
| `washer_id` | `uuid` nullable | Lavador asignado, cuando corresponde |
| `car_type` | `text` | Tipo de vehículo |
| `wash_type` | `text` | Tipo(s) de lavado |
| `washer_name` | `text` | Nombre del lavador |
| `license_plate` | `text` | Placa del vehículo |
| `price` | `numeric(10,2)` | Precio del trabajo |
| `status` | `enum wash_status` | `pending` \| `in_progress` \| `completed` \| `delivered` |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` se actualiza solo, vía trigger |

- **Tenancy y roles**: el modelo implementado define `businesses` como autolavado, `profiles` amplía el perfil de Auth y
  `business_memberships` asigna a cada cuenta el rol `admin` o `washer`. Los trabajos, lavadores,
  precios y adiciones tienen `business_id`; los trabajos incluyen `washer_id` cuando están asignados.
  La migración multi-tenant aún debe aplicarse en Supabase para que el esquema desplegado coincida.
- **Row Level Security (RLS)**: una vez aplicada la migración, los administradores acceden a los datos de su negocio. Los lavadores
  solo consultan trabajos asignados a su membresía y avanzan su estado mediante una RPC autorizada.
  Los datos de otros negocios quedan aislados. Precios, adiciones y lavadores solo son administrables
  por un administrador del mismo negocio.
- **Trigger** `update_wash_jobs_updated_at`: mantiene `updated_at` sincronizado en cada `UPDATE`.
- **Autenticación**: gestionada por Supabase Auth (registro, inicio de sesión, recuperación de contraseña);
  `auth.users` sigue siendo la identidad; `profiles` y `business_memberships` guardan perfil y acceso.
- **Adiciones por lavado**: `wash_job_addons` enlaza cada trabajo con el catálogo `addons` y almacena
  `addon_name_snapshot` y `price_snapshot`. El precio de `wash_jobs` es el total calculado por la base
  de datos como precio base más snapshots. Si se elimina una adición del catálogo, el vínculo se pone
  en `NULL` y la descripción/precio histórico se conservan.
- **Preparación semántica futura**: las entidades tienen UUIDs estables y relaciones explícitas
  (`wash_job_id`, `addon_id`); los snapshots preservan el significado histórico. Este modelo puede
  mapearse a RDF posteriormente, pero no se implementa una integración semántica en esta etapa.

### Tablas operativas y flujos

Las cuatro tablas operativas principales son:

| Tabla | Responsabilidad |
|---|---|
| `wash_jobs` | Lavados, precio total, estado (`pending` → `in_progress` → `completed` → `delivered`) y lavador asignado. |
| `washers` | Perfil operativo del lavador y token único usado para generar su QR. |
| `service_prices` | Tarifario por negocio, tipo de vehículo y tipo de lavado. El formulario QR calcula la tarifa desde esta matriz; el formulario manual permite ingresar el precio base. |
| `addons` | Catálogo de adiciones del negocio con nombre y precio. |

El QR sirve para identificar/preseleccionar al lavador en el flujo de creación; **no**
autentica a una persona ni concede acceso. La autorización depende del inicio de sesión,
la membresía y RLS. El formulario permite además leer placas colombianas con IA en la
Edge Function `recognize-plate` o ingresarlas manualmente; el historial se consulta por
placa dentro del negocio activo. Las tarifas se resuelven desde `service_prices` y las
adiciones marcadas se suman al precio base. Las imágenes de cámara se envían al proveedor
Gemini/OpenAI configurado; revisa privacidad y retención del proveedor antes de usar
imágenes reales. La clave vive únicamente en secrets de Supabase, nunca en el frontend.

Las adiciones elegidas se persisten en `wash_job_addons` con nombre y precio snapshot,
junto con el trabajo y su total mediante una RPC atómica. Los cambios de estado se
registran en `wash_job_status_history`; `delivered` es el último estado y no permite
avanzar nuevamente. El comprobante visual muestra fecha/hora, placa, vehículo, servicio,
adiciones y total.

Como tablas de soporte y acceso existen además `businesses`, `profiles`,
`business_memberships`, `wash_job_addons` y `wash_job_status_history`. El esquema
multi-tenant está definido en las migraciones versionadas. La última migración multi-tenant
debe aplicarse en Supabase antes de desplegar esta versión; los pasos de despliegue y
verificación están documentados abajo.

### Aplicar migraciones de estados y trazabilidad

Estas migraciones no se aplican automáticamente. En Supabase, abre **SQL Editor** y ejecuta
solo las migraciones aún pendientes, respetando este orden:

1. `backend/supabase/migrations/20261117150000_add_delivered_wash_status.sql`
2. `backend/supabase/migrations/20261117160000_add_wash_job_status_history.sql`
3. `backend/supabase/migrations/20261117170000_persist_wash_job_addons.sql`

La primera agrega el enum `delivered` y protege el avance del estado. La segunda crea
`wash_job_status_history`, habilita RLS con lectura limitada al propietario, y registra el
estado inicial y los cambios de estado mediante un trigger. Las entradas de historial son
generadas por la base de datos y no se pueden modificar directamente desde el cliente. La tercera
crea `wash_job_addons` con RLS de lectura por propietario y la RPC
`create_wash_job_with_addons`; esta RPC valida el usuario y el catálogo, calcula el total y persiste
el trabajo junto con sus snapshots en una sola transacción. Los formularios manual y QR la usan;
los clientes autenticados ya no pueden insertar directamente en `wash_jobs`.
Los trabajos creados antes de la migración de trazabilidad no reciben un historial retroactivo;
su seguimiento de estado comienza con cambios posteriores a esa migración.

### Aplicar el modelo multi-negocio

Antes del despliegue, realiza un respaldo de la base y confirma en Supabase que las migraciones
anteriores de estados, historial y adiciones ya fueron aplicadas. El nuevo archivo
`backend/supabase/migrations/20261117180000_business_memberships_and_roles.sql` es una migración
aditiva y debe ejecutarse **después** de esas tres, desde el SQL Editor o mediante el flujo de
migraciones ya usado por el proyecto. No edites ni vuelvas a ejecutar migraciones anteriores.

La migración crea perfiles, negocios y membresías, crea un negocio inicial por cada usuario que
tenga datos existentes en los catálogos o trabajos, y asigna esas filas al negocio correspondiente.
Los lavados se relacionan con un lavador solo si hay una coincidencia de nombre única; los casos
ambiguos quedan sin asignar para revisión manual. Reemplaza las políticas RLS antiguas por políticas
por negocio y rol y cambia las RPC de creación/avance de estado. Despliega el frontend actualizado
en coordinación con esta migración, porque la firma RPC anterior se elimina en el mismo cambio.

Acciones manuales pendientes en Supabase:

1. Hacer y verificar un respaldo, revisar previamente los usuarios propietarios y nombres de
   lavadores que no se podrán asociar automáticamente.
2. Ejecutar la nueva migración en el entorno de staging primero. Confirmar que no termina con
   `Business backfill incomplete`; ese error indica filas legacy sin propietario resoluble y debe
   corregirse antes del cutover.
3. Validar `business_id` en trabajos, lavadores, precios y adiciones; inspeccionar los lavados con
   `washer_id IS NULL` y asignar manualmente los casos ambiguos desde una sesión administrativa.
4. Verificar con dos negocios distintos que RLS impide lecturas cruzadas, y con cuentas admin/lavador
   que el rol solo ve su configuración y trabajos permitidos. Luego repetir en producción.
5. Habilitar/verificar la confirmación de correo en Supabase Auth. La RPC de invitación registra el
   correo del lavador, pero no envía correo: el administrador debe compartir el enlace de registro/
   inicio de sesión. El lavador debe entrar con ese mismo correo confirmado; la aplicación activa la
   membresía al cargar su sesión.
6. Verificar las URLs de redirección de Auth y publicar el frontend actualizado. No se requieren
   secretos ni `service_role` en el cliente.

## Cómo correr el proyecto localmente (Visual Studio Code)

Para ejecutar el backend de Supabase en Docker y conectar el frontend a esa instancia,
sigue la [guía de pruebas locales](docs/LOCAL_TESTING.md). Usa las migraciones locales
y no requiere credenciales ni conexión a un proyecto remoto.

### Scripts disponibles

Ejecuta estos comandos desde la carpeta `frontend/`.

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build de producción (carpeta `dist/`) |
| `npm run test` | Corre la suite de pruebas (Vitest) |
| `npm run lint` | Corre ESLint sobre todo el proyecto |
| `npm run preview` | Sirve el build de producción localmente |

## Estructura completa del proyecto

```
├── backend/
│   └── supabase/
│       ├── config.toml    # Configuración del proyecto Supabase
│       └── migrations/    # Historial de cambios a la base de datos (SQL)
├── frontend/
│   ├── android/           # Proyecto nativo Android (Capacitor)
│   ├── ios/               # Proyecto nativo iOS (Capacitor)
│   ├── public/            # Archivos estáticos
│   ├── src/               # Código fuente (arquitectura de 5 capas)
│   └── ...                # Vite, TypeScript, Tailwind y dependencias
├── docs/                  # ADR y documentación de arquitectura
├── DEFINITION_OF_DONE.md
└── METODOLOGIA.md
```

El backend de esta aplicación es Supabase (base de datos y autenticación); actualmente
no hay un servidor API propio. El cliente web se conecta a Supabase usando las políticas
RLS definidas por las migraciones.
