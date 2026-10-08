/**
 * Pruebas de las reglas del backend (supabase/functions/_shared). Mismos casos que la landing.
 *   npx vitest run tests/unit/backend-precios.test.ts
 */
import { describe, expect, it } from "vitest";
import raw from "../../src/data/catalogo.json";
import {
  detalle,
  maxDelGrupo,
  money,
  pasoFaltante,
  precioUnitario,
  validarSeleccion,
  type Producto,
  type Seleccion,
} from "../../supabase/functions/_shared/precios.ts";
import { aMinutos, esDiaPromo, estaAbierto, horaLegible, horaLima } from "../../supabase/functions/_shared/horario.ts";
import { evaluarCupon, type PromoFila } from "../../supabase/functions/_shared/cupones.ts";
import { armarLineas } from "../../supabase/functions/_shared/pedido.ts";
import { validarPedido, type ItemEntrada } from "../../supabase/functions/_shared/validacion.ts";
import { productoDesdeFila, type FilaProducto } from "../../supabase/functions/_shared/catalogo.ts";

const PRODUCTOS = (raw.productos as unknown as Producto[]).map((p) => ({ ...p, disponible: true, stock: 20 }));
const producto = (id: string) => structuredClone(PRODUCTOS.find((p) => p.id === id)!);
const mapa = (lista: Producto[] = PRODUCTOS) => new Map(lista.map((p) => [p.id, structuredClone(p)]));
const sel = (s: Partial<Seleccion>): Seleccion => ({ size: "u", choices: {}, qty: 1, note: "", ...s });

const clasicas = producto("clasicas");
const salsas = clasicas.groups.find((g) => g.id === "salsas")!;

describe("precios (port de la landing)", () => {
  it("formatea soles", () => {
    expect(money(32)).toBe("S/ 32.00");
    expect(money(2.5)).toBe("S/ 2.50");
  });

  it("clásicas 12 + chaufa + limonada = 41; con 2× +3 alitas = 59", () => {
    const s = { size: "12", choices: { salsas: ["bbq"], acomp: "chaufa", bebida: { limonada: 1 }, extras: {} } };
    expect(precioUnitario(clasicas, s)).toBe(41);
    expect(precioUnitario(clasicas, { ...s, choices: { ...s.choices, extras: { alitas3: 2 } } })).toBe(59);
  });

  it("combo dúo con jarra = 56; bebidas jarra = 15; burger con papas = 25; chaufa = 16", () => {
    expect(precioUnitario(producto("combo"), { size: "duo", choices: { salsas: ["bbq"], bebidaCombo: "jarra", extras: {} } })).toBe(56);
    expect(precioUnitario(producto("limonada"), { size: "j", choices: { sabor: "maracuya", picar: {} } })).toBe(15);
    expect(precioUnitario(producto("burger"), { size: "c", choices: { quitar: ["cebolla"], extrasBurger: {}, bebida: {} } })).toBe(25);
    expect(precioUnitario(producto("chaufa"), { size: "u", choices: { extrasPlato: {}, bebida: {} } })).toBe(16);
  });

  it("detalle idéntico al de la landing", () => {
    const l = { size: "12", choices: { salsas: ["buffalo", "acevichada"], acomp: "chaufa", bebida: { limonada: 1 }, extras: {} }, note: "" };
    expect(detalle(clasicas, l)).toEqual(["12 alitas", "Salsas: Buffalo Picante, Acevichada", "Acompañamiento: Arroz chaufa", "1× Limonada frozen"]);
    expect(detalle(producto("burger"), { size: "c", choices: { quitar: ["cebolla", "tomate"], extrasBurger: { carne: 1 } }, note: "sin sal" })).toEqual([
      "Con papas",
      "Sin cebolla, Sin tomate",
      "1× Doble carne",
      "Nota: sin sal",
    ]);
  });
});

describe("salsas por tamaño", () => {
  it("6 → 1, 12 → 2, 18 → 3", () => {
    expect(maxDelGrupo(salsas, clasicas, "6")).toBe(1);
    expect(maxDelGrupo(salsas, clasicas, "12")).toBe(2);
    expect(maxDelGrupo(salsas, clasicas, "18")).toBe(3);
  });

  it("rechaza más salsas que el máximo de la presentación", () => {
    const s = sel({ size: "12", choices: { salsas: ["bbq", "buffalo", "rocoto"], acomp: "papas" } });
    expect(validarSeleccion(producto("clasicas"), s)).toBe("Alitas Clásicas: puedes elegir máximo 2 salsas en esta presentación");
    const s6 = sel({ size: "6", choices: { salsas: ["bbq", "buffalo"], acomp: "papas" } });
    expect(validarSeleccion(producto("clasicas"), s6)).toMatch(/máximo 1 salsa en/);
    const s18 = sel({ size: "18", choices: { salsas: ["bbq", "buffalo", "rocoto"], acomp: "papas" } });
    expect(validarSeleccion(producto("clasicas"), s18)).toBeNull();
  });

  it("rechaza salsas no disponibles y repetidas", () => {
    const s = sel({ size: "12", choices: { salsas: ["bbq", "rocoto"], acomp: "papas" } });
    expect(validarSeleccion(producto("clasicas"), s, { salsasNoDisponibles: new Set(["rocoto"]) })).toBe(
      "La salsa Rocoto Tacneño no está disponible hoy",
    );
    expect(validarSeleccion(producto("clasicas"), sel({ size: "12", choices: { salsas: ["bbq", "bbq"], acomp: "papas" } }))).toMatch(/repetida/);
  });
});

describe("pasos obligatorios", () => {
  it("detecta el primer paso faltante", () => {
    expect(pasoFaltante(clasicas, { salsas: [], acomp: null })?.id).toBe("salsas");
    expect(pasoFaltante(clasicas, { salsas: ["bbq"], acomp: null })?.id).toBe("acomp");
    expect(pasoFaltante(clasicas, { salsas: ["bbq"], acomp: "papas" })).toBeUndefined();
  });

  it("validarSeleccion devuelve el aviso del grupo obligatorio", () => {
    expect(validarSeleccion(producto("clasicas"), sel({ size: "12", choices: {} }))).toBe("Alitas Clásicas: Elige al menos 1 salsa");
    expect(validarSeleccion(producto("clasicas"), sel({ size: "12", choices: { salsas: ["bbq"] } }))).toBe(
      "Alitas Clásicas: Elige tu acompañamiento",
    );
    expect(validarSeleccion(producto("limonada"), sel({ size: "j", choices: {} }))).toBe("Bebidas heladas: Elige el sabor");
    expect(validarSeleccion(producto("chaufa"), sel({ size: "u" }))).toBeNull();
  });

  it("rechaza presentaciones, opciones y cantidades inválidas", () => {
    expect(validarSeleccion(producto("clasicas"), sel({ size: "24" }))).toBe("Alitas Clásicas: presentación no válida");
    expect(validarSeleccion(producto("clasicas"), sel({ size: "12", choices: { salsas: ["bbq"], acomp: "yuca" } }))).toMatch(/opción no válida/);
    expect(validarSeleccion(producto("clasicas"), sel({ size: "12", choices: { salsas: ["bbq"], acomp: "papas", extras: { alitas3: 21 } } }))).toMatch(/cantidad no válida/);
    expect(validarSeleccion(producto("clasicas"), sel({ size: "12", qty: 0, choices: {} }))).toMatch(/entre 1 y 20/);
  });

  it("descarta grupos ajenos y cantidades en cero", () => {
    const s = sel({ size: "12", choices: { salsas: ["bbq"], acomp: "papas", extras: { alitas3: 0 }, hackeo: "x" } });
    expect(validarSeleccion(producto("clasicas"), s)).toBeNull();
    expect(s.choices).toEqual({ salsas: ["bbq"], acomp: "papas", extras: {}, bebida: {} });
  });
});

describe("armarLineas (crear-pedido)", () => {
  const item = (x: Partial<ItemEntrada>): ItemEntrada => ({ id: "clasicas", size: "12", choices: {}, qty: 1, note: "", ...x });

  it("recalcula precios en el servidor y arma el detalle con ' · '", () => {
    const r = armarLineas(
      [
        item({ qty: 2, choices: { salsas: ["buffalo", "acevichada"], acomp: "chaufa", bebida: { limonada: 1 } } }),
        item({ id: "papasbro", size: "u" }),
      ],
      mapa(),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.pedido.subtotal).toBe(89);
    expect(r.pedido.porcionesPromo).toBe(2);
    expect(r.pedido.lineas[0]).toMatchObject({
      producto_id: "clasicas",
      presentacion_clave: "12",
      nombre: "Alitas Clásicas",
      cantidad: 2,
      total: 82,
      salsas: ["buffalo", "acevichada"],
      detalle: "12 alitas · Salsas: Buffalo Picante, Acevichada · Acompañamiento: Arroz chaufa · 1× Limonada frozen",
    });
    expect(r.pedido.lineas[1]).toMatchObject({ nombre: "Papas Bro", total: 7, detalle: "", salsas: [] });
  });

  it("producto no disponible, agotado o con poco stock", () => {
    const lista = PRODUCTOS.map((p) =>
      p.id === "crispy" ? { ...p, disponible: false } : p.id === "gaseosa" ? { ...p, stock: 0 } : p.id === "burger" ? { ...p, stock: 2 } : p,
    );
    const crispy = armarLineas([item({ id: "crispy", choices: { salsas: ["bbq"], acomp: "papas" } })], mapa(lista));
    expect(crispy).toEqual({ ok: false, error: "Alitas Crispy Bro no está disponible por ahora" });
    expect(armarLineas([item({ id: "gaseosa", size: "u" })], mapa(lista))).toEqual({ ok: false, error: "Gaseosa 500 ml está agotado por hoy" });
    const burgers = [item({ id: "burger", size: "u", qty: 2 }), item({ id: "burger", size: "c" })];
    expect(armarLineas(burgers, mapa(lista))).toEqual({ ok: false, error: "Solo quedan 2 de Burger Bro" });
    expect(armarLineas([item({ id: "nada" })], mapa())).toMatchObject({ ok: false });
  });
});

describe("horario Lima", () => {
  it("usa la hora de Perú, no la del dispositivo", () => {
    const h = horaLima(new Date("2026-10-06T00:30:00Z")); // lunes 19:30 en Lima
    expect(h).toEqual({ dow: 1, mins: 19 * 60 + 30 });
    expect(estaAbierto(h)).toBe(true);
    expect(esDiaPromo(h, [1, 4, 0])).toBe(true);
  });
  it("cerrado antes de las 5 PM y después de las 11:30 PM", () => {
    expect(estaAbierto({ dow: 2, mins: 16 * 60 + 59 })).toBe(false);
    expect(estaAbierto({ dow: 2, mins: 23 * 60 + 31 })).toBe(false);
    expect(estaAbierto({ dow: 2, mins: 23 * 60 + 30 })).toBe(true);
  });
  it("horario configurable y que cruza la medianoche", () => {
    expect(aMinutos("17:00:00", 0)).toBe(1020);
    expect(aMinutos(null, 99)).toBe(99);
    expect(estaAbierto({ dow: 5, mins: 30 }, aMinutos("18:00", 0), aMinutos("01:00", 0))).toBe(true);
    expect(estaAbierto({ dow: 5, mins: 120 }, aMinutos("18:00", 0), aMinutos("01:00", 0))).toBe(false);
    expect(horaLegible(1020)).toBe("5:00 p. m.");
    expect(horaLegible(1410)).toBe("11:30 p. m.");
  });
});

describe("cupones", () => {
  const gracias: PromoFila = {
    id: "1", nombre: "Gracias por tu reseña", tipo: "monto", valor: "3.00", dias: [0, 1, 2, 3, 4, 5, 6],
    desde: "17:00:00", hasta: "23:30:00", activa: true, minimo: null, limite_usos: null, codigo_cupon: "GRACIASBRO",
  };
  const hora = { dow: 3, mins: 20 * 60 };

  it("monto fijo, sin pasar el subtotal", () => {
    expect(evaluarCupon(gracias, { hora, usos: 0, subtotal: 41 })).toMatchObject({ valido: true, descuento: 3, promo: { tipo: "monto", valor: 3 } });
    expect(evaluarCupon(gracias, { hora, usos: 0, subtotal: 2 }).descuento).toBe(2);
    expect(evaluarCupon(gracias, { hora, usos: 0 }).descuento).toBe(3);
  });
  it("porcentaje", () => {
    expect(evaluarCupon({ ...gracias, tipo: "porc", valor: 10 }, { hora, usos: 0, subtotal: 45.5 }).descuento).toBe(4.55);
  });
  it("rechazos", () => {
    expect(evaluarCupon(null, { hora, usos: 0 }).mensaje).toBe("Cupón no válido");
    expect(evaluarCupon({ ...gracias, activa: false }, { hora, usos: 0 }).valido).toBe(false);
    expect(evaluarCupon({ ...gracias, dias: [1] }, { hora, usos: 0 }).mensaje).toBe("Este cupón no aplica hoy");
    expect(evaluarCupon(gracias, { hora: { dow: 3, mins: 16 * 60 }, usos: 0 }).mensaje).toBe("Este cupón aplica de 17:00 a 23:30");
    expect(evaluarCupon({ ...gracias, limite_usos: 5 }, { hora, usos: 5 }).mensaje).toMatch(/límite de usos/);
    expect(evaluarCupon({ ...gracias, minimo: 30 }, { hora, usos: 0, subtotal: 29 }).mensaje).toBe("El pedido mínimo para este cupón es S/ 30.00");
    expect(evaluarCupon({ ...gracias, tipo: "3x2" }, { hora, usos: 0 }).valido).toBe(false);
  });
});

describe("validación del cuerpo de crear-pedido", () => {
  const base = { cliente: { name: "Valeria", mode: "delivery", address: "Calle Zela 715", pay: "Plin" }, items: [{ id: "papasbro", size: "u", choices: {}, qty: 1, note: "" }] };
  it("acepta el cuerpo de la landing y normaliza extras", () => {
    const r = validarPedido({ ...base, telefono: "960 394 794", cupon: " graciasbro " });
    expect(r.ok && r.datos.telefono).toBe("960394794");
    expect(r.ok && r.datos.cupon).toBe("GRACIASBRO");
  });
  it("mensajes como en la landing", () => {
    expect(validarPedido({ ...base, cliente: { ...base.cliente, name: "" } })).toEqual({ ok: false, error: "Escribe tu nombre para continuar" });
    expect(validarPedido({ ...base, cliente: { ...base.cliente, address: "" } })).toEqual({ ok: false, error: "Agrega tu dirección de entrega" });
    expect(validarPedido({ ...base, cliente: { ...base.cliente, mode: "recojo", address: "" } }).ok).toBe(true);
    expect(validarPedido({ ...base, items: [] })).toEqual({ ok: false, error: "Tu pedido está vacío" });
    expect(validarPedido({ ...base, cliente: { ...base.cliente, pay: "Bitcoin" } }).ok).toBe(false);
    expect(validarPedido({ ...base, items: [{ ...base.items[0], qty: 1.5 }] }).ok).toBe(false);
  });
});

describe("catálogo desde la BD", () => {
  it("mapea filas a Producto ordenando por orden", () => {
    const fila: FilaProducto = {
      id: "x", categoria_id: "alitas", nombre: "X", descripcion: "", badge: null, imagen: "/img/x.webp", icono: null, tile: null,
      es_promo_3x2: true, disponible: true, stock: 3, orden: 1,
      presentaciones: [
        { clave: "12", etiqueta: "12", precio: "32.00", unidades: 12, tag: null, orden: 2 },
        { clave: "6", etiqueta: "6", precio: "18.00", unidades: 6, tag: null, orden: 1 },
      ],
      grupos_opciones: [
        { clave: "salsas", titulo: "S", corto: "Salsas", tipo: "multi", obligatorio: true, min: 1, max: null, max_por_presentacion: [1, 2],
          aviso: "Elige", texto_cero: null, orden: 1,
          opciones: [{ clave: "bbq", etiqueta: "BBQ", precio_extra: "0.00", imagen: null, etiqueta_destacada: "Top", orden: 1 }] },
      ],
    };
    const p = productoDesdeFila(fila);
    expect(p.sizes.map((s) => [s.id, s.price])).toEqual([["6", 18], ["12", 32]]);
    expect(p.groups[0]).toMatchObject({ id: "salsas", maxBySize: [1, 2], need: "Elige", options: [{ id: "bbq", price: 0, tag: "Top" }] });
    expect(p.promo).toBe(true);
  });
});
