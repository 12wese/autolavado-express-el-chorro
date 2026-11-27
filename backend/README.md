# Backend API

Servidor API independiente con Node.js 20+, Express y TypeScript.

## Desarrollo

1. Copia `.env.example` a `.env` y completa las credenciales de los servicios que uses.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm run dev` para iniciar el servidor con recarga automática.

`npm run build` compila TypeScript en `dist/`; `npm start` inicia el build; `npm test`
ejecuta las pruebas de validación semántica. El endpoint `GET /health` sirve para
comprobar que el servidor está activo.

El middleware `authMiddleware` valida los tokens Bearer con Supabase Auth y adjunta
el usuario autenticado a `req.user`. Las credenciales administrativas de Supabase solo
se usan en el servidor; nunca deben exponerse al frontend.

## API privada

Las rutas `/api/*` requieren `Authorization: Bearer <access-token>` de Supabase. Si
el usuario pertenece a varios negocios, envía `X-Business-Id` con el negocio activo.
Las operaciones usan el cliente Supabase del usuario para conservar RLS.

- `GET /api/business/current` y `POST /api/business`
- `GET|POST /api/washers`, `GET /api/washers/by-token/:qrToken`, `DELETE /api/washers/:id`
- `GET|POST /api/prices`, `DELETE /api/prices/:id`
- `GET|POST /api/addons`, `DELETE /api/addons/:id`
- `GET|POST /api/washes`, `GET /api/washes/:id`, `PATCH /api/washes/:id/status`,
  `DELETE /api/washes/:id`, `GET /api/washes/status-history`, `GET /api/washes/stats`
- `POST /api/vision/recognize-plate`
- `GET /api/semantic/health`, `POST /api/semantic/query`, `POST /api/semantic/update`

La consola SPARQL es compartida y solo está disponible para administradores de un
negocio activo; admite únicamente `SELECT` y `INSERT DATA`. El repositorio RDF actual
no separa tripletas por negocio.
