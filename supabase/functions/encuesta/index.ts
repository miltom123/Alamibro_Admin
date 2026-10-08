/**
 * encuesta · Encuesta post-venta.
 *
 * POST { accion: "crear", pedidoId }            (Authorization: Bearer <JWT de admin o caja>)
 *   → { token, url }   (si el pedido ya tenía encuesta, devuelve la misma)
 * GET  ?t=<token>
 *   → { codigo, preguntas: [{ id, label, activa }], respondida }
 * POST { accion: "responder", token, estrellas, origen?, mejorar?, comentario? }
 *   → { invitarGoogle: estrellas >= 4, cupon: "GRACIASBRO" | null }
 */
import { error, json, preflight } from "../_shared/cors.ts";
import { clienteServicio, rolDeSolicitud } from "../_shared/servidor.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const corto = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function nuevoToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const sb = clienteServicio();

    // ---- Ver encuesta -----------------------------------------------------
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("t") ?? "";
      if (!token) return error("Falta el código de la encuesta");
      const { data: enc } = await sb
        .from("encuestas")
        .select("respondida_en, pedidos(codigo)")
        .eq("token", token)
        .maybeSingle();
      if (!enc) return error("Encuesta no encontrada", 404);
      const { data: aj } = await sb.from("ajustes_tienda").select("encuesta").eq("id", 1).maybeSingle();
      const preguntas = ((aj?.encuesta ?? []) as { id: string; label: string; activa: boolean }[]).filter((p) => p.activa);
      const pedido = enc.pedidos as unknown as { codigo: string } | null;
      return json({ codigo: pedido?.codigo ?? "", preguntas, respondida: !!enc.respondida_en });
    }

    if (req.method !== "POST") return error("Método no permitido", 405);
    let cuerpo: Record<string, unknown>;
    try {
      cuerpo = await req.json();
    } catch {
      return error("Solicitud inválida");
    }

    // ---- Crear (panel) ----------------------------------------------------
    if (cuerpo.accion === "crear") {
      const rol = await rolDeSolicitud(req, sb);
      if (rol !== "admin" && rol !== "caja") return error("No autorizado", 401);
      const pedidoId = typeof cuerpo.pedidoId === "string" ? cuerpo.pedidoId : "";
      if (!UUID.test(pedidoId)) return error("Pedido no válido");

      const { data: pedido } = await sb.from("pedidos").select("id").eq("id", pedidoId).maybeSingle();
      if (!pedido) return error("Pedido no encontrado", 404);

      let { data: enc } = await sb.from("encuestas").select("token").eq("pedido_id", pedidoId).maybeSingle();
      if (!enc) {
        const ins = await sb.from("encuestas").insert({ pedido_id: pedidoId, token: nuevoToken() }).select("token").single();
        if (ins.error) throw ins.error;
        enc = ins.data;
      }
      const base = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://alamibro.pe").replace(/\/+$/, "");
      return json({ token: enc!.token, url: `${base}/encuesta?t=${encodeURIComponent(enc!.token)}` });
    }

    // ---- Responder (cliente) ---------------------------------------------
    if (cuerpo.accion === "responder") {
      const token = corto(cuerpo.token, 100);
      const estrellas = cuerpo.estrellas;
      if (!token) return error("Falta el código de la encuesta");
      if (typeof estrellas !== "number" || !Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5)
        return error("Elige de 1 a 5 estrellas");

      const { data: enc } = await sb
        .from("encuestas")
        .select("id, respondida_en, pedidos(cliente_id)")
        .eq("token", token)
        .maybeSingle();
      if (!enc) return error("Encuesta no encontrada", 404);
      if (enc.respondida_en) return error("Esta encuesta ya fue respondida. ¡Gracias!", 409);

      // Marca como respondida solo si nadie se adelantó (una sola respuesta por encuesta).
      const { data: marcada } = await sb
        .from("encuestas")
        .update({ respondida_en: new Date().toISOString() })
        .eq("id", enc.id)
        .is("respondida_en", null)
        .select("id");
      if (!marcada?.length) return error("Esta encuesta ya fue respondida. ¡Gracias!", 409);

      const invitarGoogle = estrellas >= 4;
      const origen = corto(cuerpo.origen, 80);
      const { error: eR } = await sb.from("respuestas").insert({
        encuesta_id: enc.id,
        estrellas,
        origen,
        mejorar: corto(cuerpo.mejorar, 200),
        comentario: corto(cuerpo.comentario, 1000),
        invitado_google: invitarGoogle,
      });
      if (eR) {
        await sb.from("encuestas").update({ respondida_en: null }).eq("id", enc.id);
        throw eR;
      }

      // Guarda "¿Dónde nos conociste?" en el cliente si aún no lo tenía.
      const clienteId = (enc.pedidos as unknown as { cliente_id: string | null } | null)?.cliente_id;
      if (origen && clienteId)
        await sb.from("clientes").update({ origen }).eq("id", clienteId).in("origen", ["", "Web", "Caja"]);

      const codigoCupon = (Deno.env.get("CUPON_ENCUESTA") ?? "GRACIASBRO").toUpperCase();
      const { data: promo } = await sb.from("promos").select("id").eq("codigo_cupon", codigoCupon).eq("activa", true).maybeSingle();
      return json({ invitarGoogle, cupon: promo ? codigoCupon : null });
    }

    return error("Acción no válida");
  } catch (e) {
    console.error("encuesta", e);
    return error("Ocurrió un error. Intenta de nuevo en un momento.", 500);
  }
});
