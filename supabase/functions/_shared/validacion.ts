/**
 * Validación manual del cuerpo de crear-pedido (sin dependencias). TypeScript puro.
 * Mensajes iguales a los del formulario de la landing (lib/validacion.ts).
 */
import { MAX_CANTIDAD, type Elecciones } from "./precios.ts";

export const METODOS_PAGO = ["Yape", "Plin", "Efectivo", "Tarjeta"] as const;
export const MAX_ITEMS = 30;

export interface ItemEntrada {
  id: string;
  size: string;
  choices: Elecciones;
  qty: number;
  note: string;
}

export interface PedidoEntrada {
  cliente: { name: string; mode: "delivery" | "recojo"; address: string; pay: (typeof METODOS_PAGO)[number] };
  items: ItemEntrada[];
  telefono: string | null;
  cupon: string | null;
  turnstileToken: string | null;
  zonaId: string | null;
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown) => (typeof v === "string" ? v : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarPedido(cuerpo: unknown): Resultado<PedidoEntrada> {
  const no = (error: string): Resultado<PedidoEntrada> => ({ ok: false, error });
  if (!esObjeto(cuerpo)) return no("Solicitud inválida");

  const c = cuerpo.cliente;
  if (!esObjeto(c)) return no("Faltan los datos del cliente");
  const name = texto(c.name).trim();
  if (name.length < 2) return no("Escribe tu nombre para continuar");
  if (name.length > 80) return no("El nombre es demasiado largo");
  if (c.mode !== "delivery" && c.mode !== "recojo") return no("Elige delivery o recojo en local");
  const address = texto(c.address).trim();
  if (c.mode === "delivery" && address.length < 5) return no("Agrega tu dirección de entrega");
  if (address.length > 200) return no("La dirección es demasiado larga");
  if (!METODOS_PAGO.includes(c.pay as (typeof METODOS_PAGO)[number])) return no("Elige un método de pago válido");

  const items = cuerpo.items;
  if (!Array.isArray(items) || items.length === 0) return no("Tu pedido está vacío");
  if (items.length > MAX_ITEMS) return no(`Máximo ${MAX_ITEMS} productos por pedido`);
  const limpios: ItemEntrada[] = [];
  for (const it of items) {
    if (!esObjeto(it) || typeof it.id !== "string" || typeof it.size !== "string") return no("Producto inválido en el pedido");
    const qty = it.qty;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_CANTIDAD)
      return no(`La cantidad debe estar entre 1 y ${MAX_CANTIDAD}`);
    if (it.choices !== undefined && it.choices !== null && !esObjeto(it.choices)) return no("Opciones inválidas en el pedido");
    const note = texto(it.note).trim();
    if (note.length > 200) return no("La nota es demasiado larga (máx. 200 caracteres)");
    limpios.push({
      id: it.id,
      size: it.size,
      choices: structuredClone((it.choices ?? {}) as Elecciones),
      qty,
      note,
    });
  }

  let telefono: string | null = null;
  if (cuerpo.telefono !== undefined && cuerpo.telefono !== null && cuerpo.telefono !== "") {
    const dig = texto(cuerpo.telefono).replace(/\D/g, "");
    if (dig.length < 9 || dig.length > 15) return no("Escribe un número de celular válido");
    telefono = dig;
  }

  let cupon: string | null = null;
  if (cuerpo.cupon !== undefined && cuerpo.cupon !== null && cuerpo.cupon !== "") {
    cupon = texto(cuerpo.cupon).trim().toUpperCase().replace(/\s+/g, "");
    if (!cupon || cupon.length > 30) return no("Cupón no válido");
  }

  const turnstileToken = texto(cuerpo.turnstileToken) || null;

  let zonaId: string | null = null;
  if (cuerpo.zonaId !== undefined && cuerpo.zonaId !== null && cuerpo.zonaId !== "") {
    if (!UUID.test(texto(cuerpo.zonaId))) return no("Zona de delivery no válida");
    zonaId = texto(cuerpo.zonaId);
  }

  return {
    ok: true,
    datos: {
      cliente: { name, mode: c.mode, address: c.mode === "delivery" ? address : "", pay: c.pay as PedidoEntrada["cliente"]["pay"] },
      items: limpios,
      telefono,
      cupon,
      turnstileToken,
      zonaId,
    },
  };
}
