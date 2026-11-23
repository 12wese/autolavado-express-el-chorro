# Backend — Supabase

Este directorio contiene la configuración de Supabase y las migraciones SQL de la base
de datos. La aplicación usa Supabase para Postgres y autenticación; actualmente no hay
un servidor API propio.

- `supabase/config.toml`: configuración local de Supabase.
- `supabase/migrations/`: cambios versionados del esquema y las políticas RLS.
- `supabase/tests/`: pruebas SQL pgTAP para la base local.

El frontend consume Supabase directamente con la clave pública configurada en
`frontend/.env.local`; el acceso a los datos está protegido por las políticas RLS.
Consulta [la guía de pruebas locales](../docs/LOCAL_TESTING.md) para levantar Supabase
con Docker, aplicar las migraciones y conectar el frontend sin vincular un proyecto remoto.
