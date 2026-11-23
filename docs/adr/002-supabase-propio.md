# ADR 002: Crear un proyecto de Supabase propio, independiente de Lovable

## Contexto
El proyecto original se conectaba a un proyecto de Supabase (`entmwxkaznmrqaziudlk`)
provisionado automáticamente por Lovable. El equipo tenía la clave pública (`anon key`)
en el `.env`, suficiente para que la aplicación funcionara, pero **sin acceso al panel
de administración de Supabase** (no había cuenta propia registrada sobre ese proyecto).
Esto es incompatible con un proyecto universitario que se debe sustentar y del cual se
necesita mostrar control total de la base de datos (tablas, políticas RLS, usuarios).

## Decisión
1. Crear una cuenta propia en Supabase y un proyecto nuevo (`autolavado-express`,
   ref `impljtyicftypmkylgsv`).
2. Recrear el esquema exacto ejecutando el SQL equivalente a las 3 migraciones ya
   versionadas en `supabase/migrations/` (tabla `wash_jobs`, enum `wash_status`,
   políticas RLS, trigger de `updated_at`).
3. Actualizar `.env` con las credenciales del nuevo proyecto.
4. Validar manualmente el flujo completo (registro, login, crear trabajo, cambiar
   estado) contra la base de datos nueva antes de dar por cerrada la migración.

## Alternativas consideradas
- **Intentar recuperar acceso al proyecto original**: descartada tras confirmar que
  la cuenta de GitHub del equipo no tenía ninguna organización ni proyecto asociado
  en Supabase — el proyecto quedó completamente gestionado por la integración interna
  de Lovable, sin cuenta independiente que recuperar.

## Consecuencias
El equipo tiene control total y verificable de la base de datos (Table Editor,
Authentication, políticas RLS) para la sustentación. El único costo es que los datos
de prueba anteriores (si los hubiera) no se migran — se parte de una base limpia con
el mismo esquema.
