#!/usr/bin/env node
/**
 * Genera supabase/seed.sql a partir de src/data/catalogo.json (sin dependencias).
 *
 *   node scripts/generar-seed.mjs
 *
 * El SQL resultante es idempotente: se puede ejecutar varias veces (upserts).
 * Los datos que no están en el catálogo (agregados, zonas, ajustes, promos y stock
 * inicial) se definen abajo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogo = JSON.parse(readFileSync(join(raiz, "src/data/catalogo.json"), "utf8"));

const STOCK = {
  clasicas: 40, crispy: 4, combo: 18, chaufa: 22, lunes: 15, burger: 12,
  limonada: 30, gaseosa: 3, papasbro: 25, alitas3: 40,
};
const STOCK_POR_DEFECTO = 20;

const AGREGADOS = [
  ["papas", "Porción de papas", 5],
  ["cheddar", "Queso cheddar fundido", 4],
  ["salsa", "Pote de salsa extra", 2],
  ["carne", "Doble carne", 7],
  ["tocino", "Tocino extra", 3],
  ["huevo", "Huevo frito", 2],
  ["chaufa", "Arroz chaufa (acomp.)", 3],
];

const ZONAS = [
  ["Cercado de Tacna", 3],
  ["Gregorio Albarracín", 5],
  ["Ciudad Nueva", 5],
  ["Pocollay", 6],
];

const ENCUESTA = [
  { id: "estrellas", label: "Calificación de 1 a 5 estrellas", activa: true },
  { id: "origen", label: "¿Dónde nos conociste?", activa: true },
  { id: "mejorar", label: "¿Qué podemos mejorar?", activa: true },
  { id: "comentario", label: "Comentario libre", activa: true },
];

const PROMOS = [
  { nombre: "3x2 en alitas", tipo: "3x2", valor: null, dias: [1, 4, 0], desde: "17:00", hasta: "23:30", alcance: "Alitas", codigo: null, activa: true },
  { nombre: "Combo Dúo a S/ 42", tipo: "precio", valor: 42, dias: [2], desde: "17:00", hasta: "20:00", alcance: "Combos", codigo: null, activa: false },
  { nombre: "Gracias por tu reseña", tipo: "monto", valor: 3, dias: [0, 1, 2, 3, 4, 5, 6], desde: "17:00", hasta: "23:30", alcance: "Toda la carta", codigo: "GRACIASBRO", activa: true },
];

// ---------------------------------------------------------------------------

const q = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const intArr = (a) => (a && a.length ? `'{${a.join(",")}}'::int[]` : "null");
const img = (src) => (src ? "/img/" + src.replace(/^assets\//, "") : null);

const out = [];
const L = (s = "") => out.push(s);

L("-- =====================================================================");
L("-- Ala Mi Bro · Datos iniciales (GENERADO por scripts/generar-seed.mjs)");
L("-- No editar a mano: cambia src/data/catalogo.json y vuelve a generar.");
L("-- Idempotente: se puede ejecutar varias veces.");
L("-- =====================================================================");
L();
L("begin;");
L();

// Categorías (sin la categoría virtual "todo")
L("-- Categorías");
catalogo.categorias
  .filter((c) => c.id !== "todo")
  .forEach((c, i) =>
    L(`insert into public.categorias (id, label, orden) values (${q(c.id)}, ${q(c.label)}, ${i + 1})
  on conflict (id) do update set label = excluded.label, orden = excluded.orden;`),
  );
L();

// Salsas
L("-- Salsas");
catalogo.salsas.forEach((s, i) =>
  L(`insert into public.salsas (id, nombre, tag, disponible, orden) values (${q(s.id)}, ${q(s.label)}, ${q(s.tag ?? null)}, true, ${i + 1})
  on conflict (id) do update set nombre = excluded.nombre, tag = excluded.tag, orden = excluded.orden;`),
);
L();

// Productos, presentaciones, grupos y opciones
catalogo.productos.forEach((p, i) => {
  L(`-- Producto: ${p.name}`);
  L(`insert into public.productos (id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden)
values (${q(p.id)}, ${q(p.cat)}, ${q(p.name)}, ${q(p.desc ?? "")}, ${q(p.badge || null)}, ${q(img(p.img))}, ${q(p.icon ?? null)}, ${q(p.tile ?? null)}, ${q(!!p.promo)}, true, ${STOCK[p.id] ?? STOCK_POR_DEFECTO}, ${i + 1})
on conflict (id) do update set categoria_id = excluded.categoria_id, nombre = excluded.nombre, descripcion = excluded.descripcion,
  badge = excluded.badge, imagen = excluded.imagen, icono = excluded.icono, tile = excluded.tile,
  es_promo_3x2 = excluded.es_promo_3x2, orden = excluded.orden;`);

  p.sizes.forEach((s, j) =>
    L(`insert into public.presentaciones (producto_id, clave, etiqueta, precio, unidades, tag, orden)
values (${q(p.id)}, ${q(s.id)}, ${q(s.label)}, ${q(s.price)}, ${q(s.units ?? null)}, ${q(s.tag ?? null)}, ${j + 1})
on conflict (producto_id, clave) do update set etiqueta = excluded.etiqueta, precio = excluded.precio,
  unidades = excluded.unidades, tag = excluded.tag, orden = excluded.orden;`),
  );

  p.groups.forEach((g, j) => {
    L(`insert into public.grupos_opciones (producto_id, clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden)
values (${q(p.id)}, ${q(g.id)}, ${q(g.title)}, ${q(g.short ?? "")}, ${q(g.type)}, ${q(!!g.required)}, ${q(g.min ?? null)}, ${q(g.max ?? null)}, ${intArr(g.maxBySize)}, ${q(g.need ?? null)}, ${q(g.zero ?? null)}, ${j + 1})
on conflict (producto_id, clave) do update set titulo = excluded.titulo, corto = excluded.corto, tipo = excluded.tipo,
  obligatorio = excluded.obligatorio, min = excluded.min, max = excluded.max,
  max_por_presentacion = excluded.max_por_presentacion, aviso = excluded.aviso, texto_cero = excluded.texto_cero, orden = excluded.orden;`);
    g.options.forEach((o, k) =>
      L(`insert into public.opciones (grupo_id, clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden)
select g.id, ${q(o.id)}, ${q(o.label)}, ${q(o.price ?? 0)}, ${q(img(o.img))}, ${q(o.tag ?? null)}, ${k + 1}
  from public.grupos_opciones g where g.producto_id = ${q(p.id)} and g.clave = ${q(g.id)}
on conflict (grupo_id, clave) do update set etiqueta = excluded.etiqueta, precio_extra = excluded.precio_extra,
  imagen = excluded.imagen, etiqueta_destacada = excluded.etiqueta_destacada, orden = excluded.orden;`),
    );
  });
  L();
});

// Agregados
L("-- Agregados (pestaña Agregados del admin)");
AGREGADOS.forEach(([id, nombre, precio], i) =>
  L(`insert into public.agregados (id, nombre, precio, disponible, orden) values (${q(id)}, ${q(nombre)}, ${precio}, true, ${i + 1})
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, orden = excluded.orden;`),
);
L();

// Zonas
L("-- Zonas de delivery");
ZONAS.forEach(([nombre, costo], i) => {
  L(`update public.zonas_delivery set costo = ${costo}, orden = ${i + 1} where nombre = ${q(nombre)};`);
  L(`insert into public.zonas_delivery (nombre, costo, orden)
  select ${q(nombre)}, ${costo}, ${i + 1} where not exists (select 1 from public.zonas_delivery where nombre = ${q(nombre)});`);
});
L();

// Ajustes
L("-- Ajustes de la tienda");
L(`insert into public.ajustes_tienda (id, tienda_abierta, abre, cierra, whatsapp, yape, plin, direccion, encuesta)
values (1, true, '17:00', '23:30', '51960394794', '', '', ${q("Av. San Martín 1115 – Tacna")}, ${q(JSON.stringify(ENCUESTA))}::jsonb)
on conflict (id) do nothing;`);
L();

// Promos
L("-- Promos");
PROMOS.forEach((p) =>
  L(`insert into public.promos (nombre, tipo, valor, dias, desde, hasta, alcance, codigo_cupon, activa)
  select ${q(p.nombre)}, ${q(p.tipo)}, ${q(p.valor)}, ${intArr(p.dias)}, ${q(p.desde)}, ${q(p.hasta)}, ${q(p.alcance)}, ${q(p.codigo)}, ${q(p.activa)}
  where not exists (select 1 from public.promos where nombre = ${q(p.nombre)});`),
);
L();
L("commit;");
L();

const destino = join(raiz, "supabase/seed.sql");
writeFileSync(destino, out.join("\n"));
console.log(`seed.sql generado: ${catalogo.productos.length} productos → ${destino}`);
