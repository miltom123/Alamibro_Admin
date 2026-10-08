/**
 * Arma las líneas de un pedido web recalculando todo con la carta del servidor.
 * Nunca se confía en precios enviados por el cliente. TypeScript puro.
 */
import { detalle, precioUnitario, redondear, salsasDeLinea, validarSeleccion, type Producto } from "./precios.ts";
import type { ItemEntrada } from "./validacion.ts";

export interface LineaServidor {
  producto_id: string;
  presentacion_clave: string;
  nombre: string;
  detalle: string;
  cantidad: number;
  total: number;
  salsas: string[];
  detalle_json: {
    size: string;
    choices: ItemEntrada["choices"];
    note: string;
    precioUnitario: number;
    detalle: string[];
  };
}

export interface PedidoArmado {
  lineas: LineaServidor[];
  subtotal: number;
  /** Porciones de alitas con promo 3x2 (para el aviso en caja). */
  porcionesPromo: number;
}

export function armarLineas(
  items: ItemEntrada[],
  productos: Map<string, Producto>,
  salsasNoDisponibles: Set<string> = new Set(),
): { ok: true; pedido: PedidoArmado } | { ok: false; error: string } {
  const lineas: LineaServidor[] = [];
  const porProducto = new Map<string, number>();
  let porcionesPromo = 0;

  for (const it of items) {
    const p = productos.get(it.id);
    if (!p) return { ok: false, error: "Un producto de tu pedido ya no está en la carta" };
    if (p.disponible === false) return { ok: false, error: `${p.name} no está disponible por ahora` };

    const err = validarSeleccion(p, it, { salsasNoDisponibles });
    if (err) return { ok: false, error: err };

    porProducto.set(p.id, (porProducto.get(p.id) ?? 0) + it.qty);
    if (p.promo) porcionesPromo += it.qty;

    const unit = redondear(precioUnitario(p, it));
    const det = detalle(p, it);
    lineas.push({
      producto_id: p.id,
      presentacion_clave: it.size,
      nombre: p.name,
      detalle: det.join(" · "),
      cantidad: it.qty,
      total: redondear(unit * it.qty),
      salsas: salsasDeLinea(it.choices),
      detalle_json: { size: it.size, choices: it.choices, note: it.note, precioUnitario: unit, detalle: det },
    });
  }

  for (const [id, n] of porProducto) {
    const p = productos.get(id)!;
    const stock = p.stock ?? 0;
    if (stock <= 0) return { ok: false, error: `${p.name} está agotado por hoy` };
    if (n > stock) return { ok: false, error: `Solo quedan ${stock} de ${p.name}` };
  }

  const subtotal = redondear(lineas.reduce((a, l) => a + l.total, 0));
  return { ok: true, pedido: { lineas, subtotal, porcionesPromo } };
}
