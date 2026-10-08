/**
 * validar-cupon · Revisa un cupón sin registrar su uso.
 *
 * POST { codigo, subtotal?, telefono? }
 * → 200 { valido, mensaje, descuento, promo?: { nombre, tipo, valor } }
 */
import { error, json, preflight } from "../_shared/cors.ts";
import { evaluarCupon, normalizarCodigo, type PromoFila } from "../_shared/cupones.ts";
import { horaLima } from "../_shared/horario.ts";
import { clienteServicio } from "../_shared/servidor.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Método no permitido", 405);

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return error("Solicitud inválida");
  }
  const codigo = typeof cuerpo?.codigo === "string" ? normalizarCodigo(cuerpo.codigo) : "";
  if (!codigo || codigo.length > 30) return json({ valido: false, mensaje: "Escribe un cupón", descuento: 0 });
  const subtotal =
    typeof cuerpo.subtotal === "number" && Number.isFinite(cuerpo.subtotal) && cuerpo.subtotal >= 0 ? cuerpo.subtotal : null;

  try {
    const sb = clienteServicio();
    const { data: promo, error: e } = await sb.from("promos").select("*").eq("codigo_cupon", codigo).maybeSingle();
    if (e) throw e;
    let usos = 0;
    if (promo) {
      const { count } = await sb.from("cupon_usos").select("id", { count: "exact", head: true }).eq("promo_id", promo.id);
      usos = count ?? 0;
    }
    return json(evaluarCupon(promo as PromoFila | null, { hora: horaLima(), usos, subtotal }));
  } catch (e) {
    console.error("validar-cupon", e);
    return error("No pudimos validar el cupón. Intenta de nuevo.", 500);
  }
});
