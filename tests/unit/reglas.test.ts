import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alternarSalsa } from "@/lib/caja";
import { maxSalsas, productosIniciales, salsasIniciales } from "@/lib/catalogo";
import { DIA_MS, enlaceWa, haceDias, normalizarTelefono } from "@/lib/formato";
import {
  calcularResumen,
  csvPedidos,
  oportunidades,
  parsearMensaje,
  personalizar,
  puedeMarcarSinRespuesta,
  segmento,
  siguienteEstado,
  textoBeneficio,
  textoDias,
  transicionPermitida,
} from "@/lib/reglas";
import { estadoInicial } from "@/lib/api/demo-seed";
import type { Pedido } from "@/lib/tipos";

const productos = productosIniciales();
const salsas = salsasIniciales();
const mensajeLanding = readFileSync("docs/formato-mensaje-whatsapp.md", "utf8").split("```text\n")[1].split("\n```")[0];

describe("flujo de pedidos", () => {
  it("delivery pasa por camino; recojo y salón no", () => {
    expect(siguienteEstado("listo", "delivery")?.estado).toBe("camino");
    expect(siguienteEstado("listo", "recojo")?.estado).toBe("entregado");
    expect(siguienteEstado("nuevo", "salon")?.label).toBe("Aceptar");
    expect(siguienteEstado("entregado", "salon")).toBeNull();
  });
  it("las transiciones coinciden con la base de datos", () => {
    expect(transicionPermitida("nuevo", "cocina", "delivery", "cocina")).toBe(false);
    expect(transicionPermitida("nuevo", "cocina", "delivery", "caja")).toBe(true);
    expect(transicionPermitida("cocina", "listo", "delivery", "cocina")).toBe(true);
    expect(transicionPermitida("listo", "camino", "salon", "admin")).toBe(false);
    expect(transicionPermitida("listo", "entregado", "delivery", "admin")).toBe(false);
    expect(transicionPermitida("entregado", "cancelado", "salon", "admin")).toBe(false);
    expect(transicionPermitida("camino", "cancelado", "delivery", "cocina")).toBe(false);
  });
  it("sin respuesta: solo pedidos web en 'nuevo' con más de 30 min", () => {
    const ahora = Date.now();
    const base = { canal: "web", estado: "nuevo", creadoEn: ahora - 31 * 60000 } as Pedido;
    expect(puedeMarcarSinRespuesta(base, ahora)).toBe(true);
    expect(puedeMarcarSinRespuesta({ ...base, creadoEn: ahora - 10 * 60000 }, ahora)).toBe(false);
    expect(puedeMarcarSinRespuesta({ ...base, canal: "caja" }, ahora)).toBe(false);
  });
});

describe("pegar pedido de WhatsApp", () => {
  it("interpreta el mensaje exacto de la landing", () => {
    const p = parsearMensaje(mensajeLanding, productos, salsas);
    expect(p.cliente).toBe("Valeria Ticona");
    expect(p.modalidad).toBe("delivery");
    expect(p.direccion).toBe("Calle Zela 715, frente al parque");
    expect(p.pago).toBe("Plin");
    expect(p.items).toHaveLength(2);
    expect(p.total).toBe(89);
    expect(p.items[0]).toMatchObject({ qty: 2, nombre: "Alitas Clásicas", productoId: "clasicas", presentacionId: "12", salsas: ["buffalo", "acevichada"] });
    expect(p.items[0].detalle).toContain("Acompañamiento: Arroz chaufa");
    expect(p.items[1]).toMatchObject({ qty: 1, nombre: "Papas Bro", productoId: "papasbro", total: 7 });
  });
  it("lee el código cuando el pedido ya vino registrado desde la web", () => {
    const p = parsearMensaje(mensajeLanding.replace("*NUEVO PEDIDO – ALA MI BRO*", "*PEDIDO AMB-01234 – ALA MI BRO*"));
    expect(p.codigo).toBe("AMB-01234");
  });
  it("texto sin productos", () => {
    expect(parsearMensaje("hola bro").items).toHaveLength(0);
  });
});

describe("caja", () => {
  it("salsas por tamaño y reemplazo de la más antigua", () => {
    const clasicas = productos.find((p) => p.id === "clasicas")!;
    expect(maxSalsas(clasicas, "6")).toBe(1);
    expect(maxSalsas(clasicas, "18")).toBe(3);
    expect(maxSalsas(productos.find((p) => p.id === "burger")!, "u")).toBe(0);
    expect(alternarSalsa(["bbq", "buffalo"], "acevichada", 2)).toEqual(["buffalo", "acevichada"]);
    expect(alternarSalsa(["bbq"], "bbq", 2)).toEqual([]);
  });
});

describe("clientes", () => {
  const ahora = Date.now();
  it("segmentos: Inactivo > VIP > Frecuente > Nuevo", () => {
    expect(segmento({ pedidos: 12, ultimoPedido: ahora - 40 * DIA_MS }, ahora)).toBe("Inactivo");
    expect(segmento({ pedidos: 8, ultimoPedido: ahora }, ahora)).toBe("VIP");
    expect(segmento({ pedidos: 3, ultimoPedido: ahora }, ahora)).toBe("Frecuente");
    expect(segmento({ pedidos: 2, ultimoPedido: ahora }, ahora)).toBe("Nuevo");
  });
  it("campaña personalizada con {nombre}", () => {
    expect(personalizar("Hola {nombre}, ¿alitas hoy?", "Milton Flores")).toBe("Hola Milton, ¿alitas hoy?");
  });
  it("teléfonos como en la BD", () => {
    expect(normalizarTelefono("960 394 794")).toBe("51960394794");
    expect(enlaceWa("51960394794", "hola bro")).toBe("https://wa.me/51960394794?text=hola%20bro");
    expect(haceDias(ahora - 2 * DIA_MS, ahora)).toBe("Hace 2 días");
  });
});

describe("promos", () => {
  it("textos", () => {
    expect(textoBeneficio({ tipo: "porc", valor: 15 })).toBe("15% OFF");
    expect(textoBeneficio({ tipo: "monto", valor: 3 })).toBe("S/ 3 OFF");
    expect(textoBeneficio({ tipo: "3x2", valor: null })).toBe("3x2");
    expect(textoDias([0, 1, 4])).toBe("Lunes, Jueves, Domingo");
    expect(textoDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todos los días");
  });
});

describe("reportes", () => {
  // Jueves 8 oct 2026, 8:30 PM (hora del navegador del test = TZ del sistema)
  const ahora = new Date(2026, 9, 8, 20, 30).getTime();
  const s = estadoInicial(ahora);

  it("los datos de ejemplo son deterministas y coherentes", () => {
    expect(estadoInicial(ahora).pedidos.length).toBe(s.pedidos.length);
    expect(s.pedidos.every((p) => p.total === p.items.reduce((a, i) => a + i.total, 0))).toBe(true);
    expect(new Set(s.pedidos.map((p) => p.codigo)).size).toBe(s.pedidos.length);
  });

  it("resumen de hoy, semana y mes", () => {
    const hoy = calcularResumen(s.pedidos, "hoy", ahora);
    expect(hoy.barras).toHaveLength(7);
    expect(hoy.ventas).toBeCloseTo(hoy.barras.reduce((a, b) => a + b.valor, 0), 5);
    expect(hoy.deltaVentas).toMatch(/vs\. jueves pasado/);
    const sem = calcularResumen(s.pedidos, "semana", ahora);
    expect(sem.titulo).toBe("Ventas por día");
    expect(sem.barras.map((b) => b.label)).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
    expect(sem.barras.slice(4).every((b) => b.valor === 0)).toBe(true); // viernes a domingo aún no ocurren
    const mes = calcularResumen(s.pedidos, "mes", ahora);
    expect(mes.barras).toHaveLength(4);
    expect(mes.canales.web + mes.canales.recojo + mes.canales.salon).toBe(mes.pedidos);
    expect(mes.salsas.reduce((a, x) => a + x.pct, 0)).toBeGreaterThan(95);
  });

  it("cancelados y sin respuesta no cuentan como venta", () => {
    const p = s.pedidos.filter((x) => x.creadoEn >= ahora - DIA_MS * 7);
    const sin = calcularResumen(p.map((x) => ({ ...x, estado: "cancelado" as const })), "semana", ahora);
    expect(sin.ventas).toBe(0);
  });

  it("oportunidades ignoran el día en curso", () => {
    const sem = calcularResumen(s.pedidos, "semana", ahora);
    const ideas = oportunidades(sem, []);
    expect(ideas.some((i) => /jueves/i.test(i.title))).toBe(false);
  });

  it("CSV escapa comas y comillas", () => {
    const csv = csvPedidos([{ ...s.pedidos[0], cliente: 'Bro "el, grande"' }]);
    expect(csv).toContain('"Bro ""el, grande"""');
  });
});
