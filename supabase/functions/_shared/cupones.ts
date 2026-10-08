/**
 * Validación de cupones (promos con codigo_cupon). TypeScript puro: lo usan
 * validar-cupon y crear-pedido, y se prueba con Vitest.
 */
import { aMinutos, type HoraLima } from "./horario.ts";
import { money, redondear } from "./precios.ts";

export interface PromoFila {
  id: string;
  nombre: string;
  tipo: "porc" | "monto" | "3x2" | "precio";
  valor: number | string | null;
  dias: number[] | null;
  desde: string | null;
  hasta: string | null;
  activa: boolean;
  minimo: number | string | null;
  limite_usos: number | null;
  codigo_cupon: string | null;
}

export interface ResultadoCupon {
  valido: boolean;
  mensaje: string;
  descuento: number;
  promo?: { nombre: string; tipo: PromoFila["tipo"]; valor: number | null };
}

export const normalizarCodigo = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/**
 * @param promo   fila de promos (o null si el código no existe)
 * @param hora    hora actual en Lima
 * @param usos    veces que ya se usó (filas en cupon_usos)
 * @param subtotal subtotal del pedido (opcional; sin él no se valida el mínimo)
 */
export function evaluarCupon(
  promo: PromoFila | null,
  { hora, usos, subtotal }: { hora: HoraLima; usos: number; subtotal?: number | null },
): ResultadoCupon {
  const no = (mensaje: string): ResultadoCupon => ({ valido: false, mensaje, descuento: 0 });

  if (!promo || !promo.codigo_cupon) return no("Cupón no válido");
  if (!promo.activa) return no("Este cupón ya no está activo");

  const dias = promo.dias ?? [0, 1, 2, 3, 4, 5, 6];
  if (!dias.includes(hora.dow)) return no("Este cupón no aplica hoy");

  const desde = aMinutos(promo.desde, 0);
  const hasta = aMinutos(promo.hasta, 24 * 60 - 1);
  const enHorario = desde <= hasta ? hora.mins >= desde && hora.mins <= hasta : hora.mins >= desde || hora.mins <= hasta;
  if (!enHorario) return no(`Este cupón aplica de ${hhmm(desde)} a ${hhmm(hasta)}`);

  if (promo.limite_usos !== null && promo.limite_usos !== undefined && usos >= promo.limite_usos)
    return no("Este cupón ya alcanzó su límite de usos");

  const minimo = num(promo.minimo);
  const tieneSubtotal = typeof subtotal === "number" && Number.isFinite(subtotal);
  if (minimo !== null && tieneSubtotal && subtotal! < minimo)
    return no(`El pedido mínimo para este cupón es ${money(minimo)}`);

  if (promo.tipo !== "porc" && promo.tipo !== "monto")
    return no("Esta promo se aplica automáticamente en caja, no como cupón");

  const valor = num(promo.valor) ?? 0;
  let descuento = 0;
  if (promo.tipo === "monto") descuento = tieneSubtotal ? Math.min(valor, subtotal!) : valor;
  else if (tieneSubtotal) descuento = (subtotal! * valor) / 100;
  descuento = redondear(Math.max(0, descuento));

  return {
    valido: true,
    mensaje:
      promo.tipo === "porc" ? `Cupón aplicado: ${valor}% de descuento` : `Cupón aplicado: −${money(valor)}`,
    descuento,
    promo: { nombre: promo.nombre, tipo: promo.tipo, valor },
  };
}
