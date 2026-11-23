# Pruebas locales reproducibles

Este flujo levanta Supabase en Docker desde `backend/`. No necesita ni vincula un
proyecto remoto. Los comandos de esta guía no usan `--remote` ni `--linked`.

## Requisitos previos

- Docker Desktop instalado y en ejecución con contenedores Linux habilitados.
- Supabase CLI instalado y disponible como `supabase`.
- Node.js y npm para el frontend.
- Bun para instalar dependencias respetando el `bun.lock` del frontend.

## Iniciar, reiniciar y detener Supabase

En PowerShell, abre una terminal en la raíz del proyecto:

```powershell
Set-Location backend
supabase start
supabase status
```

La primera ejecución descarga las imágenes necesarias y aplica las migraciones de
`supabase/migrations/` en orden. La configuración de `project_id` identifica únicamente
este stack local.

Para reiniciar los servicios conservando la base y sus datos locales:

```powershell
Set-Location backend
supabase stop
supabase start
```

Para volver a un estado vacío y reproducible, borrar los datos **locales** y reaplicar
todas las migraciones:

```powershell
Set-Location backend
supabase db reset
```

`supabase db reset` es destructivo para la base local. No lo ejecutes si necesitas
conservar los datos locales. También ejecuta `supabase/seed.sql`, que crea un negocio
local de ejemplo con tarifas, adiciones, lavador y trabajos en distintos estados. El
usuario fixture no tiene contraseña utilizable. Para ver esos datos desde tu cuenta local,
registra/inicia sesión en la app y, en el SQL Editor **local**, asigna la membresía admin
de prueba a tu UUID:

```sql
UPDATE public.business_memberships
SET user_id = '<uuid-de-tu-usuario-local>'
WHERE business_id = '90000000-0000-0000-0000-000000000002'
  AND user_id = '90000000-0000-0000-0000-000000000001';
```

Reemplaza el UUID de ejemplo por el ID de tu usuario local. No ejecutes ese SQL en un
proyecto remoto. Para detener el stack:

```powershell
Set-Location backend
supabase stop
```

El comando `supabase stop` conserva por defecto los volúmenes locales. Evita `supabase
link`, `--linked`, `--remote` y cualquier comando de despliegue o migración remota.

## Configurar y ejecutar el frontend

Deja Supabase local en ejecución. En otra terminal:

```powershell
Set-Location frontend
bun install --frozen-lockfile
if (-not (Test-Path .env.development.local)) { Copy-Item .env.example .env.development.local }
```

Edita `frontend/.env.development.local` (archivo local, ignorado por Git) y define:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<clave-anon-publica-local>
```

Obtén la URL y la clave pública/anon local con `supabase status`, ejecutado desde
`backend/`. No copies `service_role` a `.env.local` ni al frontend. No reemplaces ni
versiones claves reales en `.env.example`.

Vite busca sus archivos de entorno en `frontend/`; para `npm run dev`, `.env.development.local`
tiene prioridad sobre `.env.local`. Si ya existe un `.env.local` con valores remotos, déjalo
intacto: define ambos valores locales en `.env.development.local` y reinicia Vite.
La configuración fija `frontend/` como raíz de Vite y detiene el arranque si el modo
desarrollo resuelve una URL Supabase no local o si faltan las variables. Si el navegador
sigue mostrando una versión anterior, reinicia el servidor y elimina el service worker/
los datos del sitio local desde las herramientas de desarrollo del navegador.

Arranca Vite desde `frontend/`:

```powershell
bun run dev
```

## Casos de prueba manuales

Usa cuentas y datos ficticios en la instancia local. Crea dos negocios con cuentas
administradoras distintas y, en el primero, invita y activa una cuenta lavador con un
correo local de prueba. Los usuarios de prueba se pueden registrar desde la aplicación;
la membresía de invitación se activa al iniciar sesión con el correo invitado.

1. **Administrador:** iniciar sesión como admin A. Verificar acceso a la configuración,
   catálogo de lavadores, precios y adiciones de su negocio. Invitar un lavador y confirmar
   que la invitación y el lavador quedan asociados a ese negocio.
2. **Lavador:** iniciar sesión con la cuenta invitada. Confirmar que ve únicamente los
   trabajos asignados a su membresía y que no puede administrar precios, adiciones ni
   lavadores. La identidad y los permisos dependen de la sesión autenticada, no de un QR.
3. **Aislamiento entre negocios:** crear datos con admin A y admin B. Comprobar que cada
   admin solo ve y modifica los de su negocio, incluidas las listas de lavadores, precios,
   adiciones, lavados e historial; probar también con URLs/IDs conocidos del otro negocio.
4. **RLS:** repetir lecturas y escrituras con admin A, admin B y el lavador. Verificar que
   una escritura sobre otro negocio falla y que un lavador no asignado no puede leer ni
   avanzar un lavado ajeno. Las llamadas directas al API deben respetar las mismas reglas
   que la interfaz.
5. **Escaneo QR/OCR de vehículo:** como admin, probar en navegador y en el wrapper
   Capacitor códigos QR con placa directa (`ABC123`), JSON
   (`{"plate":"ABC123","vehicleType":"carro"}`) y URL con placa. En navegador, apuntar la
   cámara a una placa de carro (`ABC123`) y de moto (`ABC12D`), esperar la lectura OCR
   automática y probar también **Escanear placa ahora**. En Capacitor, usar **Escanear
   código QR** y **Escanear placa ahora** para capturar una foto. Confirmar que la placa
   se normaliza, el tipo y el servicio se prellenan y solo aparece el historial reciente
   del negocio actual. Probar una placa sin historial: deben aparecer `Automóvil` y
   `Lavada General`, con precio base real de `service_prices` y extras inicialmente vacíos.
   Verificar el recálculo al seleccionar adiciones. Sin una tarifa configurada, debe
   mostrarse un aviso y la creación permanecer deshabilitada. Al crear, confirmar el
   ticket con hora del registro, desglose, total y estado `Pendiente`. En navegador, la
   cámara requiere permiso y HTTPS o `localhost`; en Capacitor, permite el acceso nativo.
   La primera inicialización del OCR requiere descargar el worker y el modelo de idioma;
   los cuadros y fotos se reconocen en el dispositivo.
6. **Crear lavado:** como admin, registrar también un lavado desde el flujo normal con
   vehículo, tipo, placa, precio base y lavador asignado. Confirmar que aparece en el
   tablero con estado `pending` y total esperado.
7. **Adiciones:** crear una adición con precio, incluirla en un nuevo lavado y comprobar
   el total y la fila asociada en el detalle. Cambiar o eliminar luego la adición del
   catálogo y confirmar que nombre y precio históricos del lavado se conservan.
8. **Historial de estados:** avanzar el lavado por `pending` → `in_progress` → `completed`
   → `delivered`. Confirmar que cada cambio queda en el historial con actor y hora, que
   se rechazan saltos/retrocesos y que el lavador solo puede avanzar trabajos asignados.

## Pruebas SQL y validaciones del frontend

Con Supabase local iniciado y desde `backend/`, ejecuta pgTAP:

```powershell
supabase test db
```

Las pruebas de `supabase/tests/` crean fixtures dentro de una transacción y no cambian
datos remotos.

Desde `frontend/`, los comandos disponibles son:

```powershell
npx tsc --noEmit -p tsconfig.app.json
bun run lint
bun run test
bun run build
```

Después de aplicar las migraciones a la base local, regenera los tipos públicos desde
`backend/` (PowerShell):

```powershell
supabase gen types typescript --local --schema public |
  Set-Content -Encoding utf8 ..\frontend\src\infrastructure\supabase\types.ts
```

Confirma los cambios del archivo generado y verifica TypeScript, pruebas y build otra vez.
