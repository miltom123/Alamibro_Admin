/** Cabeceras CORS para la landing y el panel (sitios estáticos en otro dominio). */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/** Respuesta JSON con CORS. */
export function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Error con mensaje en español: `{ error }`. */
export const error = (mensaje: string, status = 400) => json({ error: mensaje }, status);

/** Responde el preflight OPTIONS; devuelve null si no lo es. */
export const preflight = (req: Request): Response | null =>
  req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
