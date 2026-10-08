/**
 * Reglas del negocio del panel (puras, sin React ni red). Probadas en tests/unit/reglas.test.ts.
 */
import { DIA_MS, inicioDia, moneyK, money, primerNombre } from "./formato";
import { MIN_SIN_RESPUESTA } from "./config";
import type {
  Cliente,
  EstadoPedido,
  ItemPedido,
  Modalidad,
  Pedido,
  ProductoAdmin,
  Promo,
  Rol,
  Segmento,
  Salsa,
} from "./tipos";

/* ===================== Flujo de estados ===================== */

export interface Siguiente {
  estado: EstadoPedido;
  label: string;
  color: string;
}

/** nuevo → cocina → listo → (delivery: camino →) entregado. Recojo y salón saltan "camino". */
export function siguienteEstado(estado: EstadoPedido, modalidad: Modalidad): Siguiente | null {
  switch (estado) {
    case "nuevo":
    case "sin_respuesta":
      return { estado: "cocina", label: "Aceptar", color: "#E11D1F" };
    case "cocina":
      return { estado: "listo", label: "Marcar listo", color: "#D68A00" };
    case "listo":
      return modalidad === "delivery"
        ? { estado: "camino", label: "Enviar con moto", color: "#7C3AED" }
        : { estado: "entregado", label: "Entregar", color: "#7C3AED" };
    case "camino":
      return { estado: "entregado", label: "Entregado", color: "#1F9D55" };
    default:
      return null;
  }
}

/** Mismas reglas que public.transicion_permitida() en la base de datos. */
export function transicionPermitida(de: EstadoPedido, a: EstadoPedido, modalidad: Modalidad, rol: Rol): boolean {
  if (de === a) return true;
  const equipo = rol === "admin" || rol === "caja";
  if (a === "cancelado") return equipo && !["entregado", "cancelado"].includes(de);
  if ((de === "nuevo" || de === "sin_respuesta") && a === "cocina") return equipo;
  if (de === "nuevo" && a === "sin_respuesta") return equipo;
  if (de === "cocina" && a === "listo") return true;
  if (de === "listo" && a === "camino") return modalidad === "delivery";
  if (de === "listo" && a === "entregado") return modalidad !== "delivery";
  if (de === "camino" && a === "entregado") return true;
  return false;
}

export const esFinal = (e: EstadoPedido) => e === "entregado" || e === "cancelado";
export const cuentaComoVenta = (p: Pedido) => p.estado !== "cancelado" && p.estado !== "sin_respuesta";

export const puedeMarcarSinRespuesta = (p: Pedido, ahora = Date.now()) =>
  p.canal === "web" && p.estado === "nuevo" && (ahora - p.creadoEn) / 60000 > MIN_SIN_RESPUESTA;

const MSG_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "recibido",
  cocina: "en cocina",
  listo: "listo",
  camino: "en camino",
  entregado: "entregado. ¡Gracias por pedir!",
  cancelado: "cancelado",
  sin_respuesta: "pendiente de confirmar",
};

export const mensajeEstado = (p: Pick<Pedido, "cliente" | "codigo" | "estado">) =>
  `Hola ${primerNombre(p.cliente)}, tu pedido ${p.codigo} de Ala Mi Bro está ${MSG_ESTADO[p.estado]}`;

export const totalItems = (items: ItemPedido[]) => items.reduce((a, i) => a + i.total, 0);

/* ===================== Pegar pedido de WhatsApp ===================== */

export interface PedidoPegado {
  codigo: string | null;
  cliente: string;
  modalidad: Modalidad;
  direccion: string;
  pago: string;
  items: ItemPedido[];
  total: number;
}

/**
 * Convierte el mensaje que arma la landing (docs/formato-mensaje-whatsapp.md) en un pedido.
 * Acepta la cabecera "*NUEVO PEDIDO – ALA MI BRO*" y "*PEDIDO AMB-01234 – ALA MI BRO*".
 */
export function parsearMensaje(
  texto: string,
  catalogo: ProductoAdmin[] = [],
  salsas: Salsa[] = []
): PedidoPegado {
  const lineas = String(texto || "").replace(/\r/g, "").split("\n");
  const items: (ItemPedido & { _det: string[] })[] = [];
  let cur: (ItemPedido & { _det: string[] }) | null = null;
  const out: PedidoPegado = { codigo: null, cliente: "", modalidad: "recojo", direccion: "", pago: "Yape", items: [], total: 0 };

  for (const ln of lineas) {
    const cab = ln.match(/PEDIDO\s+(AMB-\d+)/i);
    if (cab) out.codigo = cab[1].toUpperCase();

    const m = ln.match(/^\s*\d+\.\s*\*?(\d+)\s*x\s+(.+?)\*?\s*[–-]\s*S\/\s*([\d.,]+)/i);
    if (m) {
      const nombre = m[2].replace(/\*/g, "").trim();
      const prod = catalogo.find((p) => p.nombre.toLowerCase() === nombre.toLowerCase());
      cur = {
        qty: parseInt(m[1], 10),
        nombre,
        detalle: "",
        total: parseFloat(m[3].replace(",", ".")),
        productoId: prod?.id ?? null,
        presentacionId: null,
        salsas: [],
        _det: [],
      };
      items.push(cur);
      continue;
    }
    if (cur && /^\s{2,}\S/.test(ln)) {
      const d = ln.trim();
      cur._det.push(d);
      const s = d.match(/^Salsas:\s*(.+)$/i);
      if (s) {
        cur.salsas = s[1].split(",").map((x) => {
          const n = x.trim();
          return salsas.find((y) => y.nombre.toLowerCase() === n.toLowerCase())?.id ?? n;
        });
      }
      const prod = cur.productoId ? catalogo.find((p) => p.id === cur!.productoId) : undefined;
      const pres = prod?.presentaciones.find((z) => z.label.toLowerCase() === d.toLowerCase());
      if (pres) cur.presentacionId = pres.id;
      continue;
    }
    const campo = (k: string) => {
      const r = ln.match(new RegExp("^\\*?" + k + ":\\*?\\s*(.+)$", "i"));
      return r ? r[1].trim() : null;
    };
    const n = campo("Nombre");
    if (n) out.cliente = n;
    const en = campo("Entrega");
    if (en) out.modalidad = /delivery/i.test(en) ? "delivery" : /sal[oó]n/i.test(en) ? "salon" : "recojo";
    const dir = campo("Dirección") ?? campo("Direccion");
    if (dir) out.direccion = dir;
    const pago = campo("Pago");
    if (pago) out.pago = pago;
    if (ln.trim() === "") cur = null;
  }
  out.items = items.map(({ _det, ...it }) => {
    // Si hay una presentación (ej. "12 alitas") la omitimos en el detalle solo si no hay más que eso.
    return { ...it, detalle: _det.join(" · ") };
  });
  out.total = totalItems(out.items);
  return out;
}

/* ===================== Clientes ===================== */

export function segmento(c: Pick<Cliente, "pedidos" | "ultimoPedido">, ahora = Date.now()): Segmento {
  const dias = c.ultimoPedido ? (ahora - c.ultimoPedido) / DIA_MS : Infinity;
  if (dias > 30) return "Inactivo";
  if (c.pedidos >= 8) return "VIP";
  if (c.pedidos >= 3) return "Frecuente";
  return "Nuevo";
}

export const personalizar = (plantilla: string, nombre: string) => plantilla.split("{nombre}").join(primerNombre(nombre));

/* ===================== Promos ===================== */

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export function textoBeneficio(p: Pick<Promo, "tipo" | "valor">) {
  if (p.tipo === "3x2") return "3x2";
  if (p.tipo === "porc") return (p.valor || 0) + "% OFF";
  if (p.tipo === "monto") return "S/ " + (p.valor || 0) + " OFF";
  return "S/ " + (p.valor || 0);
}

export function textoDias(dias: number[]) {
  const set = ORDEN_SEMANA.filter((d) => dias.includes(d));
  if (set.length === 7) return "Todos los días";
  return set.map((d) => NOMBRES_DIA[d]).join(", ");
}

export const nombreDia = (d: number) => NOMBRES_DIA[d];

/* ===================== Resumen de ventas ===================== */

export type Rango = "hoy" | "semana" | "mes";

export interface Resumen {
  titulo: string;
  sub: string;
  ventas: number;
  pedidos: number;
  ticket: number;
  deltaVentas: string;
  deltaTicket: string;
  deltaPositivo: boolean;
  recurrentes: number;
  barras: { label: string; valor: number; detalle: string; parcial?: boolean }[];
  canales: { web: number; recojo: number; salon: number };
  top: { nombre: string; qty: number; importe: number }[];
  salsas: { nombre: string; pct: number }[];
}

const HORAS = [17, 18, 19, 20, 21, 22, 23];
const horaLabel = (h: number) => (h > 12 ? h - 12 : h) + (h >= 12 ? " PM" : " AM");
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function inicioSemana(t: number) {
  const d = new Date(inicioDia(t));
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return d.getTime();
}

function rangoFechas(rango: Rango, ahora: number) {
  if (rango === "hoy") {
    const ini = inicioDia(ahora);
    const nombre = NOMBRES_DIA[new Date(ahora).getDay()].toLowerCase();
    return { ini, fin: ahora, prevIni: ini - 7 * DIA_MS, prevFin: ahora - 7 * DIA_MS, vs: "vs. " + nombre + " pasado" };
  }
  if (rango === "semana") {
    const ini = inicioSemana(ahora);
    return { ini, fin: ahora, prevIni: ini - 7 * DIA_MS, prevFin: ahora - 7 * DIA_MS, vs: "vs. semana pasada" };
  }
  const ini = inicioDia(ahora) - 27 * DIA_MS;
  return { ini, fin: ahora, prevIni: ini - 28 * DIA_MS, prevFin: ini - 1, vs: "vs. mes pasado" };
}

export function canalDe(p: Pedido): "web" | "recojo" | "salon" {
  if (p.canal === "web") return "web";
  return p.modalidad === "salon" ? "salon" : "recojo";
}

export function calcularResumen(
  pedidos: Pedido[],
  rango: Rango,
  ahora = Date.now(),
  nombreSalsa: (id: string) => string = (x) => x
): Resumen {
  const r = rangoFechas(rango, ahora);
  const validos = pedidos.filter(cuentaComoVenta);
  const actual = validos.filter((p) => p.creadoEn >= r.ini && p.creadoEn <= r.fin);
  const previo = validos.filter((p) => p.creadoEn >= r.prevIni && p.creadoEn <= r.prevFin);

  const ventas = actual.reduce((a, p) => a + p.total, 0);
  const ventasPrev = previo.reduce((a, p) => a + p.total, 0);
  const ticket = actual.length ? ventas / actual.length : 0;
  const ticketPrev = previo.length ? ventasPrev / previo.length : 0;

  let deltaVentas = "Sin datos para comparar";
  let deltaPositivo = true;
  if (ventasPrev > 0) {
    const pct = Math.round(((ventas - ventasPrev) / ventasPrev) * 100);
    deltaPositivo = pct >= 0;
    deltaVentas = (pct >= 0 ? "+" : "") + pct + "% " + r.vs;
  }
  const dt = ticket - ticketPrev;
  const deltaTicket = ticketPrev > 0 ? (dt >= 0 ? "+" : "−") + money(Math.abs(dt)) + " " + r.vs : "Sin datos para comparar";

  // Barras
  let barras: Resumen["barras"];
  let titulo: string;
  let sub: string;
  if (rango === "hoy") {
    titulo = "Ventas por hora";
    sub = "Hoy, de 5 PM a 11 PM";
    barras = HORAS.map((h) => {
      const v = actual
        .filter((p) => {
          const hh = new Date(p.creadoEn).getHours();
          return h === 17 ? hh <= 17 : h === 23 ? hh >= 23 : hh === h;
        })
        .reduce((a, p) => a + p.total, 0);
      return { label: horaLabel(h), valor: v, detalle: horaLabel(h) };
    });
  } else if (rango === "semana") {
    titulo = "Ventas por día";
    sub = "Lunes a domingo";
    barras = Array.from({ length: 7 }, (_, i) => {
      const d0 = r.ini + i * DIA_MS;
      const dow = new Date(d0).getDay();
      const v = actual.filter((p) => p.creadoEn >= d0 && p.creadoEn < d0 + DIA_MS).reduce((a, p) => a + p.total, 0);
      return { label: DIAS_CORTOS[dow], valor: v, detalle: NOMBRES_DIA[dow], parcial: d0 + DIA_MS > ahora };
    });
  } else {
    titulo = "Ventas por semana";
    sub = "Últimas 4 semanas";
    barras = Array.from({ length: 4 }, (_, i) => {
      const s0 = r.ini + i * 7 * DIA_MS;
      const v = actual.filter((p) => p.creadoEn >= s0 && p.creadoEn < s0 + 7 * DIA_MS).reduce((a, p) => a + p.total, 0);
      return { label: "Sem " + (i + 1), valor: v, detalle: "Semana " + (i + 1) };
    });
  }

  const canales = { web: 0, recojo: 0, salon: 0 };
  actual.forEach((p) => canales[canalDe(p)]++);

  const prod = new Map<string, { nombre: string; qty: number; importe: number }>();
  const conteoSalsas = new Map<string, number>();
  actual.forEach((p) =>
    p.items.forEach((it) => {
      const x = prod.get(it.nombre) ?? { nombre: it.nombre, qty: 0, importe: 0 };
      x.qty += it.qty;
      x.importe += it.total;
      prod.set(it.nombre, x);
      (it.salsas ?? []).forEach((s) => conteoSalsas.set(s, (conteoSalsas.get(s) ?? 0) + it.qty));
    })
  );
  const top = [...prod.values()].sort((a, b) => b.importe - a.importe).slice(0, 5);

  const totalSalsas = [...conteoSalsas.values()].reduce((a, b) => a + b, 0);
  const ordenadas = [...conteoSalsas.entries()].sort((a, b) => b[1] - a[1]);
  const salsas = ordenadas.slice(0, 5).map(([id, n]) => ({ nombre: nombreSalsa(id), pct: Math.round((n / totalSalsas) * 100) }));
  const resto = ordenadas.slice(5).reduce((a, [, n]) => a + n, 0);
  if (resto) salsas.push({ nombre: "Otras", pct: Math.round((resto / totalSalsas) * 100) });

  // Clientes que vuelven: pedidos cuyo teléfono ya había pedido antes.
  const primeraVez = new Map<string, number>();
  validos.forEach((p) => {
    if (!p.telefono) return;
    const t = primeraVez.get(p.telefono);
    if (t === undefined || p.creadoEn < t) primeraVez.set(p.telefono, p.creadoEn);
  });
  const recurrentes = actual.filter((p) => p.telefono && (primeraVez.get(p.telefono) ?? p.creadoEn) < p.creadoEn).length;

  return { titulo, sub, ventas, pedidos: actual.length, ticket, deltaVentas, deltaTicket, deltaPositivo, recurrentes, barras, canales, top, salsas };
}

/** Ideas accionables a partir de la semana actual y del stock. */
export function oportunidades(semana: Resumen, stockBajo: ProductoAdmin[]) {
  const out: { title: string; text: string }[] = [];
  if (stockBajo.length)
    out.push({
      title: "Repón antes de la hora pico",
      text: stockBajo.map((p) => p.nombre + " (" + p.stock + ")").join(", ") + " están por agotarse.",
    });
  // Solo días ya cerrados (hoy todavía no termina).
  const conVentas = semana.barras.filter((b) => b.valor > 0 && !b.parcial);
  if (conVentas.length >= 2) {
    const flojo = [...conVentas].sort((a, b) => a.valor - b.valor)[0];
    const fuerte = [...conVentas].sort((a, b) => b.valor - a.valor)[0];
    out.push({
      title: "El " + flojo.detalle.toLowerCase() + " es tu día más flojo",
      text: `Vendes ${moneyK(flojo.valor)} frente a ${moneyK(fuerte.valor)} del ${fuerte.detalle.toLowerCase()}. Prueba una promo solo para ese día, por ejemplo el Combo Dúo a precio especial.`,
    });
    const promo = semana.barras.filter((b) => ["Lunes", "Jueves", "Domingo"].includes(b.detalle)).reduce((a, b) => a + b.valor, 0);
    if (semana.ventas > 0)
      out.push({
        title: "El 3x2 mueve la semana",
        text: `Lunes, jueves y domingo suman ${Math.round((promo / semana.ventas) * 100)}% de las ventas. Mantén stock de alitas alto esos días.`,
      });
  }
  out.push({
    title: "Sube el ticket con bebidas",
    text: "Las bebidas aparecen en pocos pedidos frente a las alitas. Ofrece la jarra de chicha en el panel “¿Algo más?” de la landing.",
  });
  return out;
}

/* ===================== CSV ===================== */

const celda = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export const csv = (filas: unknown[][]) => "﻿" + filas.map((f) => f.map(celda).join(",")).join("\n");

export const csvPedidos = (pedidos: Pedido[]) =>
  csv([
    ["Pedido", "Fecha", "Cliente", "Teléfono", "Canal", "Modalidad", "Pago", "Pagado", "Estado", "Total"],
    ...pedidos.map((o) => [
      o.codigo,
      new Date(o.creadoEn).toLocaleString("es-PE"),
      o.cliente,
      o.telefono,
      o.canal,
      o.modalidad,
      o.pago,
      o.pagado ? "sí" : "no",
      o.estado,
      o.total.toFixed(2),
    ]),
  ]);

export const csvProductos = (top: Resumen["top"]) =>
  csv([["Producto", "Unidades", "Importe"], ...top.map((t) => [t.nombre, t.qty, t.importe.toFixed(2)])]);

export const dataUri = (contenido: string) => "data:text/csv;charset=utf-8," + encodeURIComponent(contenido);
