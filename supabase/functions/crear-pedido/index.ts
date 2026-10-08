/**
 * crear-pedido · Registra un pedido de la landing antes de abrir WhatsApp.
 *
 * POST { cliente: { name, mode: "delivery"|"recojo", address, pay },
 *        items: [{ id, size, choices, qty, note }],
 *        telefono?, cupon?, turnstileToken?, zonaId? }
 * → 200 { codigo: "AMB-01234", total, subtotal, descuento, promo3x2 }
 * → 4xx/5xx { error: "mensaje en español" }
 *
 * Recalcula todos los precios con la carta de la BD, valida horario, tienda abierta,
 * disponibilidad, stock, salsas, cupón, Turnstile (si TURNSTILE_SECRET) y límite por IP.
 */
import { armarLineas } from "../_shared/pedido.ts";
import { SELECT_PRODUCTOS, productoDesdeFila, type FilaProducto } from "../_shared/catalogo.ts";
import { error, json, preflight } from "../_shared/cors.ts";
import { evaluarCupon, type PromoFila } from "../_shared/cupones.ts";
import { aMinutos, ABRE_MIN, CIERRA_MIN, esDiaPromo, estaAbierto, horaLegible, horaLima } from "../_shared/horario.ts";
import { redondear, type Producto } from "../_shared/precios.ts";
import { validarPedido } from "../_shared/validacion.ts";
import { clienteServicio, hashIp, ipCliente, verificarTurnstile } from "../_shared/servidor.ts";

const LIMITE_POR_MINUTO = 3;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return error("Método no permitido", 405);

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return error("Solicitud inválida");
  }
  const v = validarPedido(cuerpo);
  if (!v.ok) return error(v.error);
  const datos = v.datos;

  try {
    const sb = clienteServicio();
    const ip = ipCliente(req);

    // Anti-bots (solo si hay TURNSTILE_SECRET).
    if (!(await verificarTurnstile(datos.turnstileToken, ip)))
      return error("No pudimos verificar que eres humano. Recarga la página e intenta otra vez.", 403);

    // Límite: máximo 3 pedidos web por IP por minuto.
    const ipHash = ip ? await hashIp(ip) : null;
    if (ipHash) {
      const { count, error: e } = await sb
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("creado_en", new Date(Date.now() - 60_000).toISOString());
      if (e) throw e;
      if ((count ?? 0) >= LIMITE_POR_MINUTO)
        return error("Hiciste varios pedidos seguidos. Espera un minuto e intenta de nuevo.", 429);
    }

    // Tienda abierta y horario (hora de Lima).
    const { data: aj, error: eAj } = await sb.from("ajustes_tienda").select("tienda_abierta, abre, cierra").eq("id", 1).maybeSingle();
    if (eAj) throw eAj;
    if (aj && !aj.tienda_abierta) return error("La tienda está cerrada en este momento. ¡Vuelve pronto!", 409);
    const abre = aMinutos(aj?.abre, ABRE_MIN);
    const cierra = aMinutos(aj?.cierra, CIERRA_MIN);
    const hora = horaLima();
    if (Deno.env.get("IGNORAR_HORARIO") !== "1" && !estaAbierto(hora, abre, cierra))
      return error(`Atendemos de ${horaLegible(abre)} a ${horaLegible(cierra)}. ¡Te esperamos!`, 409);

    // Carta desde la BD.
    const ids = [...new Set(datos.items.map((i) => i.id))];
    const [{ data: filas, error: eProd }, { data: salsas, error: eSal }] = await Promise.all([
      sb.from("productos").select(SELECT_PRODUCTOS).in("id", ids),
      sb.from("salsas").select("id, disponible"),
    ]);
    if (eProd) throw eProd;
    if (eSal) throw eSal;
    const productos = new Map<string, Producto>(
      ((filas ?? []) as unknown as FilaProducto[]).map((f) => [f.id, productoDesdeFila(f)]),
    );
    const salsasNoDisponibles = new Set((salsas ?? []).filter((s) => !s.disponible).map((s) => s.id as string));

    const armado = armarLineas(datos.items, productos, salsasNoDisponibles);
    if (!armado.ok) return error(armado.error, 422);
    const { lineas, subtotal, porcionesPromo } = armado.pedido;

    // Cupón opcional.
    let descuento = 0;
    let promoId: string | null = null;
    if (datos.cupon) {
      const { data: promo, error: eP } = await sb.from("promos").select("*").eq("codigo_cupon", datos.cupon).maybeSingle();
      if (eP) throw eP;
      let usos = 0;
      if (promo) {
        const { count } = await sb.from("cupon_usos").select("id", { count: "exact", head: true }).eq("promo_id", promo.id);
        usos = count ?? 0;
      }
      const r = evaluarCupon(promo as PromoFila | null, { hora, usos, subtotal });
      if (!r.valido) return error(r.mensaje, 422);
      descuento = r.descuento;
      promoId = (promo as PromoFila).id;
    }

    // Zona de delivery opcional.
    let zonaId: string | null = null;
    if (datos.zonaId && datos.cliente.mode === "delivery") {
      const { data: z } = await sb.from("zonas_delivery").select("id").eq("id", datos.zonaId).maybeSingle();
      if (!z) return error("Zona de delivery no válida", 422);
      zonaId = z.id;
    }

    // 3x2 del día (aviso para caja; el descuento lo aplica caja al confirmar).
    const { data: p3 } = await sb.from("promos").select("dias").eq("tipo", "3x2").eq("activa", true).is("codigo_cupon", null);
    const promo3x2 = porcionesPromo >= 3 && (p3 ?? []).some((p) => esDiaPromo(hora, (p.dias as number[]) ?? []));

    const total = redondear(Math.max(0, subtotal - descuento));
    const { data: creado, error: eIns } = await sb
      .rpc("insertar_pedido_web", {
        p_pedido: {
          cliente_nombre: datos.cliente.name,
          telefono: datos.telefono,
          modalidad: datos.cliente.mode,
          direccion: datos.cliente.address,
          metodo_pago: datos.cliente.pay,
          nota: promo3x2 ? "Aplicar promo 3x2 en alitas" : "",
          cupon: datos.cupon,
          descuento,
          subtotal,
          total,
          zona_id: zonaId,
          ip_hash: ipHash,
        },
        p_items: lineas,
        p_promo_id: promoId,
      })
      .single();
    if (eIns) throw eIns;
    const fila = creado as { codigo: string; total: number | string };

    return json({ codigo: fila.codigo, total: Number(fila.total), subtotal, descuento, promo3x2 });
  } catch (e) {
    console.error("crear-pedido", e);
    return error("No pudimos registrar tu pedido. Intenta de nuevo en un momento.", 500);
  }
});
