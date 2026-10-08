/**
 * Datos de ejemplo del modo demo: pedidos en vivo como en el diseño + 8 semanas de historial
 * generado de forma determinista (mismos números en cada carga del mismo día).
 */
import { DIA_MS, inicioDia } from "../formato";
import { agregadosIniciales, productosIniciales, salsasIniciales } from "../catalogo";
import type { Ajustes, ItemPedido, Pedido, ProductoAdmin, Promo, Resena, ZonaDelivery } from "../tipos";

export interface EstadoDemo {
  version: 1;
  secuencia: number;
  /** Pedidos a los que ya se les descontó stock (al pasar a cocina). */
  descontados: string[];
  pedidos: Pedido[];
  productos: ProductoAdmin[];
  salsas: ReturnType<typeof salsasIniciales>;
  agregados: ReturnType<typeof agregadosIniciales>;
  promos: Promo[];
  resenas: Resena[];
  origenes: Record<string, string>; // teléfono → ¿dónde nos conoció?
  ajustes: Ajustes;
  zonas: ZonaDelivery[];
}

/** RNG determinista (mulberry32). */
function rng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLIENTES = [
  { nombre: "Milton Flores", tel: "51987654321", pedidos: 12, ultimo: 2, origen: "Instagram", salsa: "bbq" },
  { nombre: "Paola Vizcarra", tel: "51912345678", pedidos: 7, ultimo: 5, origen: "TikTok", salsa: "acevichada" },
  { nombre: "Fiorella Chambi", tel: "51922211100", pedidos: 9, ultimo: 3, origen: "Instagram", salsa: "honey" },
  { nombre: "Alejandro Vargas", tel: "51955512340", pedidos: 3, ultimo: 9, origen: "Recomendación", salsa: "buffalo" },
  { nombre: "Luis Apaza", tel: "51933322211", pedidos: 5, ultimo: 41, origen: "Pasó por el local", salsa: "bbq" },
  { nombre: "Diego Quispe", tel: "51911100099", pedidos: 2, ultimo: 36, origen: "Google", salsa: "rocoto" },
  { nombre: "Karina Mamani", tel: "51944433322", pedidos: 1, ultimo: 1, origen: "Facebook", salsa: "maracuya" },
  { nombre: "Valeria Ticona", tel: "51900099988", pedidos: 2, ultimo: 0, origen: "TikTok", salsa: "bbq" },
];

const PESO_SALSA: [string, number][] = [
  ["bbq", 34],
  ["buffalo", 24],
  ["acevichada", 15],
  ["maracuya", 11],
  ["honey", 9],
  ["teriyaki", 4],
  ["parmesano", 3],
];
/** Pedidos por día de la semana (0 = domingo). Los días de 3x2 venden más. */
const VOLUMEN = [24, 20, 8, 9, 23, 11, 19];
const PESO_HORA: [number, number][] = [
  [17, 5],
  [18, 11],
  [19, 18],
  [20, 26],
  [21, 21],
  [22, 13],
  [23, 6],
];
const PESO_PRODUCTO: [string, number][] = [
  ["clasicas", 32],
  ["crispy", 17],
  ["combo", 12],
  ["burger", 9],
  ["limonada", 10],
  ["chaufa", 5],
  ["lunes", 4],
  ["papasbro", 6],
  ["gaseosa", 5],
];

function elegir<T>(r: () => number, pesos: [T, number][]): T {
  const total = pesos.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of pesos) {
    if ((x -= w) < 0) return v;
  }
  return pesos[pesos.length - 1][0];
}

function itemAleatorio(r: () => number, productos: ProductoAdmin[], nombresSalsa: Record<string, string>, salsaFav?: string): ItemPedido {
  const id = elegir(r, PESO_PRODUCTO);
  const p = productos.find((x) => x.id === id)!;
  const zi = p.presentaciones.length > 1 ? Math.min(p.presentaciones.length - 1, Math.floor(r() * p.presentaciones.length * 0.9)) : 0;
  const z = p.presentaciones[zi];
  const qty = r() < 0.82 ? 1 : 2;
  const salsas: string[] = [];
  const max = p.salsasPorTamano[zi] ?? 0;
  for (let i = 0; i < max; i++) {
    const s = i === 0 && salsaFav && r() < 0.6 ? salsaFav : elegir(r, PESO_SALSA);
    if (!salsas.includes(s)) salsas.push(s);
  }
  const det: string[] = [];
  if (p.presentaciones.length > 1) det.push(z.label);
  if (salsas.length) det.push("Salsas: " + salsas.map((s) => nombresSalsa[s] ?? s).join(", "));
  return { qty, nombre: p.nombre, detalle: det.join(" · "), total: z.precio * qty, productoId: p.id, presentacionId: z.id, salsas };
}

export function estadoInicial(ahora = Date.now()): EstadoDemo {
  const productos = productosIniciales();
  const salsas = salsasIniciales();
  const nombresSalsa = Object.fromEntries(salsas.map((s) => [s.id, s.nombre]));
  const r = rng(Math.floor(inicioDia(ahora) / DIA_MS));
  const hoy = inicioDia(ahora);
  const historial: Omit<Pedido, "codigo">[] = [];
  let n = 0;

  const crear = (t: number, cliente: string, tel: string, salsaFav?: string): Omit<Pedido, "codigo"> => {
    const web = r() < 0.47;
    const modalidad = web ? (r() < 0.75 ? "delivery" : "recojo") : r() < 0.6 ? "recojo" : "salon";
    const items: ItemPedido[] = [itemAleatorio(r, productos, nombresSalsa, salsaFav)];
    if (r() < 0.45) items.push(itemAleatorio(r, productos, nombresSalsa, salsaFav));
    const total = items.reduce((a, i) => a + i.total, 0);
    const cancelado = r() < 0.03;
    return {
      id: "h" + ++n,
      cliente: cliente || (modalidad === "salon" ? "Mesa " + (1 + Math.floor(r() * 9)) : "Cliente"),
      telefono: tel,
      canal: web ? "web" : "caja",
      modalidad,
      direccion: modalidad === "delivery" ? "Tacna" : "",
      pago: elegir(r, [["Yape", 50], ["Plin", 15], ["Efectivo", 25], ["Tarjeta", 10]] as [string, number][]),
      pagado: true,
      estado: cancelado ? "cancelado" : "entregado",
      nota: "",
      total,
      items,
      creadoEn: t,
      entregadoEn: t + (25 + Math.floor(r() * 20)) * 60000,
    };
  };

  const horaAleatoria = (dia: number) => {
    const h = elegir(r, PESO_HORA);
    return dia + h * 3600_000 + Math.floor(r() * 59) * 60000;
  };

  // Historial anónimo: 56 días hacia atrás + lo que va de hoy (pedidos ya entregados).
  for (let d = 56; d >= 0; d--) {
    const dia = hoy - d * DIA_MS;
    const dow = new Date(dia).getDay();
    const cant = Math.round(VOLUMEN[dow] * (0.85 + r() * 0.3));
    for (let i = 0; i < cant; i++) {
      const t = horaAleatoria(dia);
      if (t > ahora - 60 * 60000) continue;
      historial.push(crear(t, "", ""));
    }
  }
  // Clientes conocidos: el número de pedidos y el último pedido coinciden con el diseño.
  for (const c of CLIENTES) {
    for (let k = 0; k < c.pedidos; k++) {
      const diasAtras = k === 0 ? c.ultimo : c.ultimo + 2 + Math.floor(r() * 50);
      const dia = hoy - diasAtras * DIA_MS;
      let t = horaAleatoria(dia);
      if (t > ahora - 60 * 60000) t = ahora - 61 * 60000 - k * 60000;
      if (c.ultimo === 0 && k === 0) continue; // Valeria: su pedido de hoy se crea en vivo (pegado desde WhatsApp)
      historial.push(crear(t, c.nombre, c.tel, c.salsa));
    }
  }

  historial.sort((a, b) => a.creadoEn - b.creadoEn);
  let sec = 1;
  const pedidosHist: Pedido[] = historial.map((p) => ({ ...p, codigo: "AMB-" + String(sec++).padStart(5, "0") }));

  // Pedidos en vivo (como en el diseño), con los minutos relativos a "ahora".
  const m = (x: number) => ahora - x * 60000;
  const it = (pid: string, pres: string, qty: number, salsasIds: string[], extra = "", totalExtra = 0): ItemPedido => {
    const p = productos.find((x) => x.id === pid)!;
    const z = p.presentaciones.find((x) => x.id === pres)!;
    const det: string[] = [];
    if (p.presentaciones.length > 1) det.push(z.label);
    if (salsasIds.length) det.push("Salsas: " + salsasIds.map((s) => nombresSalsa[s]).join(", "));
    if (extra) det.push(extra);
    return { qty, nombre: p.nombre, detalle: det.join(" · "), total: (z.precio + totalExtra) * qty, productoId: pid, presentacionId: pres, salsas: salsasIds };
  };
  const vivos: Omit<Pedido, "codigo">[] = [
    { id: "v1", cliente: "Diego Quispe", telefono: "51911100099", canal: "caja", modalidad: "recojo", direccion: "", pago: "Tarjeta", pagado: true, estado: "entregado", nota: "", items: [it("combo", "per", 1, ["rocoto"], "Bebida: Gaseosa 500 ml")], total: 0, creadoEn: m(48), entregadoEn: m(20) },
    { id: "v2", cliente: "Luis Apaza", telefono: "51933322211", canal: "web", modalidad: "delivery", direccion: "Av. Leguía 1020", pago: "Efectivo", pagado: false, estado: "camino", nota: "Paga con S/ 50", items: [it("lunes", "u", 1, [], "1× +3 alitas", 9)], total: 0, creadoEn: m(24) },
    { id: "v3", cliente: "Fiorella Chambi", telefono: "51922211100", canal: "web", modalidad: "delivery", direccion: "Calle Zela 715", pago: "Yape", pagado: true, estado: "listo", nota: "", items: [it("clasicas", "18", 1, ["bbq", "rocoto", "teriyaki"], "Acompañamiento: Camote frito")], total: 0, creadoEn: m(18) },
    { id: "v4", cliente: "Paola Vizcarra", telefono: "51912345678", canal: "web", modalidad: "delivery", direccion: "Urb. Vigil Mz B Lte 12", pago: "Yape", pagado: true, estado: "cocina", nota: "Tocar timbre blanco", items: [it("burger", "c", 1, [], "1× Doble carne", 7), it("papascheddar", "u", 1, [])], total: 0, creadoEn: m(27) },
    { id: "v5", cliente: "Mesa 4", telefono: "", canal: "caja", modalidad: "salon", direccion: "", pago: "Efectivo", pagado: true, estado: "cocina", nota: "", items: [it("crispy", "6", 2, ["honey"]), it("gaseosa", "u", 2, [])], total: 0, creadoEn: m(9) },
    { id: "v6", cliente: "Karina Mamani", telefono: "51944433322", canal: "web", modalidad: "recojo", direccion: "", pago: "Plin", pagado: true, estado: "nuevo", nota: "", items: [it("combo", "duo", 1, ["acevichada", "maracuya"], "Bebida: Chicha morada")], total: 0, creadoEn: m(5) },
    { id: "v7", cliente: "Milton Flores", telefono: "51987654321", canal: "web", modalidad: "delivery", direccion: "Av. Bolognesi 450, Dpto 302", pago: "Yape", pagado: false, estado: "nuevo", nota: "Salsa aparte, por favor", items: [it("clasicas", "12", 1, ["bbq", "buffalo"], "Acompañamiento: Papas fritas"), it("frozen", "u", 1, [])], total: 0, creadoEn: m(2) },
  ];
  const pedidosVivos: Pedido[] = vivos.map((p) => ({ ...p, total: p.items.reduce((a, i) => a + i.total, 0), codigo: "AMB-" + String(sec++).padStart(5, "0") }));

  const resenas: Resena[] = [
    { id: "r1", nombre: "Milton F.", telefono: "51987654321", pedido: pedidosHist.at(-5)?.codigo ?? "AMB-00019", fecha: hoy - DIA_MS + 21 * 3600_000 + 10 * 60000, estrellas: 5, texto: "Las alitas BBQ llegaron crocantes y calientitas. La salsa de rocoto es otro nivel.", origen: "Instagram", tema: "", invitadoGoogle: true },
    { id: "r2", nombre: "Paola V.", telefono: "51912345678", pedido: pedidosHist.at(-12)?.codigo ?? "AMB-00016", fecha: hoy - DIA_MS + 20 * 3600_000 + 2 * 60000, estrellas: 4, texto: "Muy ricas, pero las papas llegaron un poco frías.", origen: "TikTok", tema: "Temperatura", invitadoGoogle: true },
    { id: "r3", nombre: "Luis A.", telefono: "51933322211", pedido: pedidosHist.at(-40)?.codigo ?? "AMB-00011", fecha: hoy - 3 * DIA_MS + 22 * 3600_000 + 40 * 60000, estrellas: 3, texto: "Demoró casi 50 minutos, aunque el sabor estuvo bien.", origen: "Pasó por el local", tema: "Tiempo de entrega", invitadoGoogle: false },
    { id: "r4", nombre: "Karina M.", telefono: "51944433322", pedido: pedidosHist.at(-60)?.codigo ?? "AMB-00008", fecha: hoy - 4 * DIA_MS + 19 * 3600_000 + 30 * 60000, estrellas: 5, texto: "El 3x2 del jueves vale totalmente la pena. Volveremos.", origen: "Facebook", tema: "", invitadoGoogle: true },
  ];

  return {
    version: 1,
    secuencia: sec,
    descontados: pedidosVivos.filter((p) => p.estado !== "nuevo").map((p) => p.id),
    pedidos: [...pedidosHist, ...pedidosVivos],
    productos,
    salsas,
    agregados: agregadosIniciales(),
    promos: [
      { id: "p1", nombre: "3x2 en alitas", tipo: "3x2", valor: null, desde: "17:00", hasta: "23:30", dias: [1, 4, 0], alcance: "Alitas", codigo: null, activa: true },
      { id: "p2", nombre: "Combo Dúo a S/ 42", tipo: "precio", valor: 42, desde: "17:00", hasta: "20:00", dias: [2], alcance: "Combos", codigo: null, activa: false },
      { id: "p3", nombre: "Gracias por tu reseña", tipo: "monto", valor: 3, desde: "17:00", hasta: "23:30", dias: [1, 2, 3, 4, 5, 6, 0], alcance: "Toda la carta", codigo: "GRACIASBRO", activa: true },
    ],
    resenas,
    origenes: Object.fromEntries(CLIENTES.map((c) => [c.tel, c.origen])),
    ajustes: {
      tiendaAbierta: true,
      abre: "17:00",
      cierra: "23:30",
      whatsapp: "51960394794",
      yape: "",
      plin: "",
      direccion: "Av. San Martín 1115 – Tacna",
      encuesta: [
        { id: "estrellas", label: "Calificación de 1 a 5 estrellas", activa: true },
        { id: "origen", label: "¿Dónde nos conociste?", activa: true },
        { id: "mejorar", label: "¿Qué podemos mejorar?", activa: true },
        { id: "comentario", label: "Comentario libre", activa: true },
      ],
    },
    zonas: [
      { id: "z1", nombre: "Cercado de Tacna", costo: 3 },
      { id: "z2", nombre: "Gregorio Albarracín", costo: 5 },
      { id: "z3", nombre: "Ciudad Nueva", costo: 5 },
      { id: "z4", nombre: "Pocollay", costo: 6 },
    ],
  };
}
