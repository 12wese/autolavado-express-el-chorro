# Pruebas locales

## Edge Function de lectura de placas

La función `recognize-plate` requiere un usuario autenticado de Supabase y una clave
privada del proveedor de visión. Gemini (`gemini-2.5-flash`) es el proveedor por defecto;
también puede elegirse OpenAI (`gpt-4o-mini`). Las imágenes se envían desde la Edge
Function al proveedor configurado para realizar la inferencia. Verifica sus condiciones
de privacidad y retención antes de usar imágenes reales; no incluyas placas/imágenes reales
en fixtures o logs.

1. Copia `backend/supabase/.env.example` a un archivo local ignorado por Git, por ejemplo
   `backend/supabase/.env.local`, y agrega allí la clave del proveedor. No uses ni pegues la
   clave en código, documentación, terminal compartida o frontend.
2. Desde `backend/supabase/`, inicia el stack local con `supabase start`.
3. Sirve la función con el archivo local de variables:

   ```sh
   supabase functions serve recognize-plate --env-file .env.local
   ```

   El runtime local provee `SUPABASE_URL` y `SUPABASE_ANON_KEY`. La función valida el
   bearer token contra Supabase Auth y no usa `service_role`.
4. Inicia el frontend (`npm run dev` desde `frontend/`), autentícate con un usuario local
   válido, abre el formulario QR y permite acceso a la cámara. La lectura automática toma
   cuadros JPEG reducidos (máximo 800 px, calidad 0.75) cada 2.5 segundos hasta reconocer
   una placa. También puedes pulsar **Leer placa con IA** o usar QR/OCR local.
5. Si la función devuelve `401`, confirma que estás autenticado y que la función local
   tiene la misma configuración Auth; `503` indica que falta configurar la clave del
   proveedor.

En un proyecto Supabase remoto, configura `AI_VISION_API_KEY` y opcionalmente
`AI_VISION_PROVIDER` en **Edge Function Secrets** del proyecto, despliega la función y
verifica la URL/redirecciones de Auth. La clave del proveedor nunca va en variables
`VITE_*`, ni se despliega desde `.env.example`.

## Verificaciones frontend

Ejecuta desde `frontend/`:

```sh
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run test
npm run build
```

Los tests de Vitest mockean `supabase.functions.invoke` y no llaman proveedores externos.
