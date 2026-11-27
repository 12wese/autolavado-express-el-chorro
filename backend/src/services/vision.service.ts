import { z } from 'zod';
import { HttpError } from '../lib/http-error';

const platePrompt = `Eres un sistema experto en visión artificial especializado en el estándar oficial de placas vehiculares de Colombia (RUNT / Ministerio de Transporte). Analiza la imagen y extrae únicamente la placa principal del vehículo.

Reglas de formatos de placas en Colombia:
1. Automóviles, camionetas, camperos y vehículos de servicio público/carga:
   - Formato: 3 LETRAS seguidas de 3 DÍGITOS (ej. ABC123).
   - Colores de referencia: fondo amarillo con letras negras (particular), fondo blanco con letras negras (público/taxi/bus), fondo azul (diplomático), fondo verde (remolques/semirremolques: R + 5 dígitos o S + 5 dígitos).
   - Clasificación esperada: "automovil" (o "camioneta" si la carrocería visible es claramente camioneta/SUV/pickup).
2. Motocicletas:
   - Formato: 3 LETRAS seguidas de 2 DÍGITOS y finaliza con 1 LETRA (ej. ABC12D). (Las motos antiguas pueden tener 3 letras + 2 dígitos, ej. ABC12).
   - Colores de referencia: fondo amarillo con letras negras (moto particular) o fondo blanco (moto oficial/pública).
   - Clasificación esperada: "moto".
3. Motocarros y cuatrimotos:
   - Formato: 3 DÍGITOS seguidos de 3 LETRAS (ej. 123ABC).
   - Clasificación esperada: "moto".

Reglas estrictas de lectura y desambiguación:
- Normaliza en MAYÚSCULAS, sin espacios, puntos ni guiones (ni el nombre del municipio debajo como "FLORENCIA", "BOGOTÁ", "NEIVA", etc.).
- Desambigua caracteres según su posición en el formato colombiano: en posiciones de letra usa 'O', 'I', 'S', 'B', 'Z'; en posiciones de número usa '0', '1', '5', '8', '2'.
- Ignora calcomanías, logos de marcas, teléfonos en defensa o placas de otros vehículos lejanos en el fondo.
- Si no hay ninguna placa legible o está cortada/borrosa, devuelve plate: null.

Responde EXCLUSIVAMENTE con este JSON válido:
{
  "plate": "ABC123" | null,
  "vehicleType": "automovil" | "camioneta" | "moto" | null,
  "confidence": 0.0 a 1.0,
  "rawText": "texto observado"
}`;

const maxImageBytes = 5 * 1024 * 1024;
const allowedPlatePattern = /^(?:[A-Z]{3}\d{3}|[A-Z]{3}\d{2}[A-Z]?|\d{3}[A-Z]{3})$/;
const visionResultSchema = z.object({
  plate: z.string().nullable(),
  vehicleType: z.enum(['automovil', 'camioneta', 'moto']).nullable(),
  confidence: z.number().finite().min(0).max(1),
  rawText: z.string().transform((value) => value.slice(0, 300)),
});

function decodeImage(imageBase64: string): string {
  const normalized = imageBase64.replace(/^data:image\/jpeg;base64,/i, '');
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new HttpError(400, 'Invalid JPEG image data');
  }
  const bytes = Buffer.from(normalized, 'base64');
  if (bytes.length > maxImageBytes) {
    throw new HttpError(413, 'Image exceeds the 5 MB limit');
  }
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new HttpError(400, 'Image must be JPEG encoded');
  }
  return normalized;
}

function parseProviderResult(value: unknown) {
  const parsed = visionResultSchema.safeParse(value);
  if (!parsed.success) throw new HttpError(502, 'Vision provider returned an invalid result');

  const result = {
    ...parsed.data,
    plate: parsed.data.plate?.toUpperCase().replace(/[\s.-]/g, '') ?? null,
  };
  if (result.plate !== null && !allowedPlatePattern.test(result.plate)) {
    throw new HttpError(502, 'Vision provider returned an invalid Colombian plate');
  }
  if (result.plate === null && result.vehicleType !== null) {
    throw new HttpError(502, 'Vision provider returned an inconsistent result');
  }
  return result;
}

export async function recognizePlate(imageBase64: string) {
  const apiKey = process.env.AI_VISION_API_KEY?.trim();
  if (!apiKey) throw new HttpError(503, 'Vision provider is not configured');
  const image = decodeImage(imageBase64);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: platePrompt },
              { inline_data: { mime_type: 'image/jpeg', data: image } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      },
    );
  } catch {
    throw new HttpError(502, 'Vision provider request failed');
  }
  if (!response.ok) throw new HttpError(502, 'Vision provider request failed');

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new HttpError(502, 'Vision provider returned invalid JSON');
  }
  if (!isRecord(body) || !Array.isArray(body.candidates)) {
    throw new HttpError(502, 'Vision provider returned an invalid response');
  }
  const candidate = body.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content)
    || !Array.isArray(candidate.content.parts)) {
    throw new HttpError(502, 'Vision provider returned an invalid response');
  }
  const textPart = candidate.content.parts.find(
    (part: unknown) => isRecord(part) && typeof part.text === 'string',
  );
  if (!isRecord(textPart) || typeof textPart.text !== 'string') {
    throw new HttpError(502, 'Vision provider returned no recognition result');
  }

  let result: unknown;
  try {
    result = JSON.parse(textPart.text) as unknown;
  } catch {
    throw new HttpError(502, 'Vision provider returned invalid result JSON');
  }
  return parseProviderResult(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
