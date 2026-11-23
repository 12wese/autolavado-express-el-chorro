# Definition of Done (DoD)

Una historia o cambio se declara **terminado para el código** solo si cumple los
criterios aplicables siguientes. El despliegue a Supabase/producción se registra por
separado; una migración pendiente no se presenta como aplicada.

## Producto y calidad

- [ ] Se cumplen los criterios de aceptación y se conserva el comportamiento no incluido
      explícitamente en el cambio.
- [ ] Las reglas de dominio afectadas tienen pruebas unitarias relevantes. Como mínimo,
      los cambios en precios, pagos, estados, validadores o estadísticas cubren sus casos
      válidos, inválidos y límites pertinentes.
- [ ] `npm run test` pasa desde `frontend/`.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` pasa desde `frontend/`.
- [ ] `npm run build` pasa desde `frontend/`.
- [ ] `npm run lint` se ejecuta. No se agregan errores en los archivos tocados; los
      errores preexistentes del lint global se identifican en el registro, sin ocultarlos
      ni atribuirlos al cambio.

## Arquitectura

- [ ] `domain/` contiene entidades, enums, validadores y reglas puras; no importa React,
      Supabase ni la interfaz.
- [ ] `data/repositories/` es la única capa que realiza llamadas al cliente Supabase.
- [ ] `application/` expone hooks/casos de uso y coordina dominio con repositorios.
- [ ] `infrastructure/` contiene clientes y tipos externos.
- [ ] `presentation/` depende de aplicación/dominio y componentes de interfaz, pero no
      importa repositorios ni el cliente Supabase.
- [ ] Los cambios de arquitectura o integraciones relevantes quedan explicados en README
      o en un ADR cuando corresponda.

## Datos, seguridad y documentación

- [ ] Cada migración de base de datos es nueva, fechada y revisada; no se modifican
      migraciones anteriores.
- [ ] RLS permanece habilitado y las políticas/RPCs validan el rol, tenant y asignación
      desde la base de datos cuando aplique.
- [ ] No se añade ni modifica ningún secreto o archivo `.env`.
- [ ] README, metodología y backlog reflejan el estado real del producto; las tareas
      diferidas y migraciones no aplicadas quedan identificadas como tales.
- [ ] Se registra fecha, comando, resultado y limitaciones de TypeScript, lint, tests y
      build en `docs/verification/`.
- [ ] Para despliegues con migración: se verifica primero en staging; se registra cuándo
      se aplicó en Supabase y las comprobaciones manuales pendientes. Sin acceso o
      autorización para aplicarla, se declara **pendiente**, no completada en producción.
