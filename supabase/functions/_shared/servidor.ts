/**
 * Utilidades de servidor para las Edge Functions (usan Deno.env y fetch).
 */
// deno-lint-ignore no-import-prefix -- Supabase Edge Functions resuelve npm: sin import map
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Cliente con service role: salta RLS. Solo se usa dentro de las Edge Functions. */
export function clienteServicio(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** IP del cliente (primera de x-forwarded-for). */
export function ipCliente(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return (xff.split(",")[0] || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim();
}

export async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash de la IP con sal (IP_SALT) para el límite de pedidos sin guardar la IP. */
export const hashIp = (ip: string) => sha256Hex(ip + "|" + (Deno.env.get("IP_SALT") ?? "alamibro"));

/** Verifica Cloudflare Turnstile. Devuelve true si no hay TURNSTILE_SECRET configurado. */
export async function verificarTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  if (!secret) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const d = (await r.json()) as { success?: boolean };
    return d.success === true;
  } catch (e) {
    console.error("Turnstile no respondió", e);
    return false;
  }
}

/** Rol (admin/caja/cocina) del usuario del header Authorization, o null. */
export async function rolDeSolicitud(req: Request, sb: SupabaseClient): Promise<string | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data.user) return null;
  const { data: perfil } = await sb.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle();
  return (perfil?.rol as string | undefined) ?? null;
}
