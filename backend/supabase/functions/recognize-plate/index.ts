const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

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

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAiResult(value: unknown): {
  plate: string | null;
  vehicleType: "automovil" | "camioneta" | "moto" | null;
  confidence: number;
  rawText: string;
} {
  if (!isRecord(value)) throw new Error("Invalid vision response");

  if (value.plate !== null && typeof value.plate !== "string") {
    throw new Error("Invalid vision response");
  }
  if (value.vehicleType !== null && value.vehicleType !== "automovil"
    && value.vehicleType !== "camioneta" && value.vehicleType !== "moto") {
    throw new Error("Invalid vision response");
  }
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence)
    || value.confidence < 0 || value.confidence > 1 || typeof value.rawText !== "string") {
    throw new Error("Invalid vision response");
  }

  const plate = typeof value.plate === "string"
    ? value.plate.toUpperCase().replace(/[\s.-]/g, "")
    : null;
  const vehicleType = value.vehicleType;
  const confidence = value.confidence;
  const rawText = value.rawText.slice(0, 300);

  if (plate !== null && !allowedPlatePattern.test(plate)) {
    throw new Error("Invalid Colombian plate format");
  }
  if (plate === null && vehicleType !== null) {
    throw new Error("Invalid vision response");
  }
  return { plate, vehicleType, confidence, rawText };
}

async function requestVision(
  provider: string,
  apiKey: string,
  imageBase64: string,
): Promise<unknown> {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: platePrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        }],
        max_tokens: 300,
      }),
    });
    if (!response.ok) throw new Error("Vision provider request failed");
    const body: unknown = await response.json();
    if (!isRecord(body) || !Array.isArray(body.choices)) {
      throw new Error("Invalid vision provider response");
    }
    const choice = body.choices[0];
    if (!isRecord(choice) || !isRecord(choice.message)
      || typeof choice.message.content !== "string") {
      throw new Error("Invalid vision provider response");
    }
    return JSON.parse(choice.message.content) as unknown;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: platePrompt },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );
  if (!response.ok) throw new Error("Vision provider request failed");
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.candidates)) {
    throw new Error("Invalid vision provider response");
  }
  const candidate = body.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content)
    || !Array.isArray(candidate.content.parts)) {
    throw new Error("Invalid vision provider response");
  }
  const textPart = candidate.content.parts.find(
    (part: unknown) => isRecord(part) && typeof part.text === "string",
  );
  if (!isRecord(textPart) || typeof textPart.text !== "string") {
    throw new Error("Invalid vision provider response");
  }
  return JSON.parse(textPart.text) as unknown;
}

Deno.serve(async (request: Request): Promise<Response> => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > 7 * 1024 * 1024) {
      return jsonResponse({ error: "Request exceeds the 7 MB limit" }, 413);
    }

    const authorization = request.headers.get("Authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!bearerToken || !supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${bearerToken}` },
    });
    if (!userResponse.ok) return jsonResponse({ error: "Authentication required" }, 401);

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400);
    }
    if (!isRecord(requestBody) || typeof requestBody.imageBase64 !== "string") {
      return jsonResponse({ error: "imageBase64 is required" }, 400);
    }
    if (requestBody.imageBase64.length > Math.ceil(maxImageBytes / 3) * 4 + 30) {
      return jsonResponse({ error: "Image exceeds the 5 MB limit" }, 413);
    }
    const imageBase64 = requestBody.imageBase64.replace(/^data:image\/jpeg;base64,/i, "");
    if (!imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
      return jsonResponse({ error: "Invalid JPEG image data" }, 400);
    }
    if (imageBase64.length % 4 !== 0) {
      return jsonResponse({ error: "Invalid JPEG image data" }, 400);
    }
    let decodedImage: string;
    try {
      decodedImage = atob(imageBase64);
    } catch {
      return jsonResponse({ error: "Invalid JPEG image data" }, 400);
    }
    const imageBytes = decodedImage.length;
    if (imageBytes > maxImageBytes) {
      return jsonResponse({ error: "Image exceeds the 5 MB limit" }, 413);
    }
    if (decodedImage.charCodeAt(0) !== 0xff || decodedImage.charCodeAt(1) !== 0xd8) {
      return jsonResponse({ error: "Image must be JPEG encoded" }, 400);
    }

    const provider = (Deno.env.get("AI_VISION_PROVIDER") ?? "gemini").toLowerCase();
    if (provider !== "gemini" && provider !== "openai") {
      return jsonResponse({ error: "Unsupported vision provider" }, 400);
    }
    const apiKey = Deno.env.get("AI_VISION_API_KEY")?.trim()
      || Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!apiKey) {
      return jsonResponse({ error: "Vision provider is not configured" }, 200);
    }

    const result = await requestVision(provider, apiKey, imageBase64);
    return jsonResponse(normalizeAiResult(result), 200);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Plate recognition is temporarily unavailable";
    return jsonResponse({ error: message }, 200);
  }
});
