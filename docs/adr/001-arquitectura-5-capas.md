# ADR 001: Migrar a una arquitectura de 5 capas

## Contexto
El proyecto original (generado con Lovable) tenía toda la lógica mezclada dentro de
los componentes de React: `KanbanBoard.tsx`, `NewWashDialog.tsx`, `WashHistory.tsx` y
`WasherStats.tsx` importaban el cliente de Supabase directamente y repetían, con
pequeñas diferencias, las mismas reglas de negocio (transiciones de estado, cálculo
del reparto de ganancias 60/40, validaciones de formulario). Los tipos como `WashJob`
también estaban definidos de forma local y ligeramente distinta en cada archivo.

## Decisión
Reorganizar `src/` en 5 capas con una regla estricta: **la capa de presentación nunca
importa Supabase directamente**, todo el acceso a datos pasa por repositorios.

- `domain/` — entidades (`WashJob`), enums (`WashStatus`), reglas de negocio
  (transiciones de estado, reparto de ganancias) y validadores Zod. Sin dependencias
  de React ni de Supabase.
- `data/repositories/` — único lugar que llama a `@supabase/supabase-js`
  (`wash-jobs.repository.ts`, `auth.repository.ts`).
- `application/` — casos de uso: hooks (`useWashJobs`, `useMonthlyWashJobs`,
  `useCreateWashJob`, `useAuthSession`) y servicios (`wash-stats.service.ts`) que
  conectan dominio y datos.
- `infrastructure/supabase/` — cliente de Supabase y tipos generados.
- `presentation/` — páginas y componentes, consumen únicamente hooks de `application/`.

## Alternativas consideradas
- **Dejarlo como estaba**: rechazada — la duplicación de lógica crece con cada
  funcionalidad nueva y ya generaba inconsistencias entre `WashHistory` y
  `WasherStats` (ambos calculaban lo mismo con código copiado).
- **Un state manager global (Redux/Zustand)**: rechazada — sobredimensionado para el
  tamaño actual del proyecto; una capa de dominio con funciones puras resuelve el
  problema real (duplicación y mezcla de responsabilidades) sin agregar dependencias.

## Consecuencias
Los componentes de presentación quedaron más simples (solo renderizan y delegan a
hooks). La lógica de negocio quedó centralizada y verificable de forma aislada. Todo
cambio futuro al modelo de datos (por ejemplo, agregar un estado nuevo) se hace en un
solo lugar (`domain/enums/wash-status.enum.ts` y `domain/rules/wash-status.rules.ts`)
en vez de tocar 4 componentes distintos.
