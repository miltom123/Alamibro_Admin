#!/usr/bin/env node
/**
 * Prueba las migraciones + seed en un Postgres embebido (PGlite) con stubs de Supabase
 * (esquema auth, roles anon/authenticated/service_role, storage y la publicación de Realtime).
 *
 * PGlite NO es dependencia del proyecto. Instálalo aparte y apunta PGLITE_DIR a esa carpeta:
 *
 *   mkdir -p /tmp/pglite && (cd /tmp/pglite && npm init -y && npm i @electric-sql/pglite)
 *   PGLITE_DIR=/tmp/pglite node scripts/probar-sql.mjs
 *
 * (Si @electric-sql/pglite se puede resolver desde aquí, PGLITE_DIR es opcional.)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

async function cargarPGlite() {
  const base = process.env.PGLITE_DIR ? join(process.env.PGLITE_DIR, "package.json") : join(raiz, "package.json");
  let ruta = createRequire(base).resolve("@electric-sql/pglite");
  const esm = ruta.replace(/\.cjs$/, ".js");
  if (existsSync(esm)) ruta = esm;
  const mod = await import(pathToFileURL(ruta).href);
  return mod.PGlite ?? mod.default.PGlite;
}

const PGlite = await cargarPGlite();
const db = new PGlite();

// ---------------------------------------------------------------------------
// Mini framework de pruebas
// ---------------------------------------------------------------------------
let ok = 0;
let fallas = 0;
async function prueba(nombre, fn) {
  try {
    await fn();
    ok++;
    console.log("  ✓ " + nombre);
  } catch (e) {
    fallas++;
    console.log("  ✗ " + nombre + "\n      " + (e?.message ?? e));
  }
}
function igual(real, esperado, msg = "") {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${msg} esperado ${b}, obtenido ${a}`);
}
async function debeFallar(promesa, patron) {
  try {
    await promesa;
  } catch (e) {
    if (patron && !patron.test(e.message)) throw new Error(`falló con otro mensaje: ${e.message}`);
    return;
  } finally {
    await db.exec("reset role");
  }
  throw new Error("se esperaba un error y no lo hubo");
}

const uno = async (sql, params) => (await db.query(sql, params)).rows[0];
const filas = async (sql, params) => (await db.query(sql, params)).rows;

/** Ejecuta fn como un usuario (uid) autenticado, como anon (null) o como service_role ("service"). */
async function como(uid, fn) {
  if (uid === "service") await db.exec("set role service_role; select set_config('request.jwt.claim.sub', '', false)");
  else if (uid) await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]).then(() => db.exec("set role authenticated"));
  else await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false)");
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false)");
  }
}

// ---------------------------------------------------------------------------
// Stubs de Supabase
// ---------------------------------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;

  create publication supabase_realtime;
`);

console.log("Migraciones");
const dirMig = join(raiz, "supabase/migrations");
for (const f of readdirSync(dirMig).filter((f) => f.endsWith(".sql")).sort()) {
  await prueba(f, () => db.exec(readFileSync(join(dirMig, f), "utf8")));
}
const seed = readFileSync(join(raiz, "supabase/seed.sql"), "utf8");
await prueba("seed.sql", () => db.exec(seed));
await prueba("seed.sql es idempotente (segunda vez)", () => db.exec(seed));

if (fallas) {
  console.log(`\n${fallas} falla(s) al aplicar el esquema; se detienen las pruebas.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
console.log("\nSeed");
await prueba("conteos", async () => {
  const r = await uno(`select
    (select count(*) from categorias)::int cat, (select count(*) from productos)::int prod,
    (select count(*) from salsas)::int sal, (select count(*) from agregados)::int agr,
    (select count(*) from zonas_delivery)::int zon, (select count(*) from promos)::int pro,
    (select count(*) from presentaciones)::int pres, (select count(*) from ajustes_tienda)::int aj`);
  igual(r, { cat: 6, prod: 13, sal: 8, agr: 7, zon: 4, pro: 3, pres: 21, aj: 1 });
});
await prueba("stock inicial y rutas de imagen", async () => {
  const r = await filas("select id, stock, imagen from productos where id in ('clasicas','crispy','frozen') order by id");
  igual(r, [
    { id: "clasicas", stock: 40, imagen: "/img/bbq.webp" },
    { id: "crispy", stock: 4, imagen: "/img/crispy.webp" },
    { id: "frozen", stock: 20, imagen: "/img/limonada.webp" },
  ]);
});
await prueba("salsas máximas por tamaño en clásicas = {1,2,3}", async () => {
  const r = await uno("select max_por_presentacion m from grupos_opciones where producto_id='clasicas' and clave='salsas'");
  igual(r.m, [1, 2, 3]);
});
await prueba("cupón guardado en mayúsculas", async () => {
  igual((await uno("select codigo_cupon c from promos where tipo='monto'")).c, "GRACIASBRO");
});
await prueba("Realtime: pedidos y pedido_items en supabase_realtime", async () => {
  const r = await filas("select tablename from pg_publication_tables where pubname='supabase_realtime' order by 1");
  igual(r.map((x) => x.tablename), ["pedido_items", "pedidos"]);
});
await prueba("Storage: bucket productos público con 4 políticas", async () => {
  igual((await uno("select public from storage.buckets where id='productos'")).public, true);
  igual((await uno("select count(*)::int n from pg_policies where schemaname='storage'")).n, 4);
});

// ---------------------------------------------------------------------------
// Usuarios del equipo
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CAJA = "00000000-0000-0000-0000-00000000000c";
const COCINA = "00000000-0000-0000-0000-0000000000cc";
await db.exec(`
  insert into auth.users (id, email) values
    ('${ADMIN}', 'admin@alamibro.pe'), ('${CAJA}', 'caja@alamibro.pe'), ('${COCINA}', 'cocina@alamibro.pe');
  insert into perfiles (id, nombre, rol) values
    ('${ADMIN}', 'Dueño', 'admin'), ('${CAJA}', 'Caja 1', 'caja'), ('${COCINA}', 'Cocina', 'cocina');
`);

console.log("\nRLS");
await prueba("rol_actual()", async () => {
  igual(await como(CAJA, () => uno("select rol_actual() r")), { r: "caja" });
  igual(await como(null, () => uno("select rol_actual() r")), { r: null });
});
await prueba("anon lee la carta", async () => {
  igual((await como(null, () => uno("select count(*)::int n from productos"))).n, 13);
});
await prueba("anon solo ve promos activas sin cupón", async () => {
  const r = await como(null, () => filas("select nombre from promos"));
  igual(r.map((x) => x.nombre), ["3x2 en alitas"]);
});
await prueba("anon no puede leer pedidos", () => debeFallar(como(null, () => filas("select * from pedidos")), /permission denied/));
await prueba("anon no puede insertar pedidos", () =>
  debeFallar(como(null, () => db.exec("insert into pedidos (canal, modalidad) values ('web','recojo')")), /permission denied/));
await prueba("anon no puede ejecutar registrar_venta_caja", () =>
  debeFallar(como(null, () => db.query("select registrar_venta_caja('{}'::jsonb)")), /permission denied/));
await prueba("anon no ve agregados", () => debeFallar(como(null, () => filas("select * from agregados")), /permission denied/));
await prueba("caja no puede editar productos directamente", async () => {
  await como(CAJA, () => db.exec("update productos set stock = 999, nombre = 'x' where id = 'clasicas'"));
  igual((await uno("select stock from productos where id='clasicas'")).stock, 40);
});
await prueba("caja ve agregados y la promo con cupón", async () => {
  igual((await como(CAJA, () => uno("select count(*)::int n from agregados"))).n, 7);
  igual((await como(CAJA, () => uno("select count(*)::int n from promos"))).n, 3);
});
await prueba("perfiles: caja ve solo el suyo, admin ve todos", async () => {
  igual((await como(CAJA, () => uno("select count(*)::int n from perfiles"))).n, 1);
  igual((await como(ADMIN, () => uno("select count(*)::int n from perfiles"))).n, 3);
});
await prueba("caja no puede cambiarse el rol", async () => {
  await como(CAJA, () => db.exec(`update perfiles set rol = 'admin' where id = '${CAJA}'`));
  igual((await uno(`select rol from perfiles where id='${CAJA}'`)).rol, "caja");
});

// ---------------------------------------------------------------------------
console.log("\nVenta de caja");
const venta = {
  cliente: "Valeria Ticona",
  telefono: "960 111 222",
  modalidad: "salon",
  pago: "Yape",
  pagado: true,
  items: [
    { productoId: "clasicas", presentacionId: "12", nombre: "Alitas Clásicas", detalle: "12 alitas · Salsas: Buffalo Picante, BBQ Ahumada", qty: 2, total: 64, salsas: ["buffalo", "bbq"] },
    { productoId: "papasbro", presentacionId: "u", nombre: "Papas Bro", detalle: "", qty: 1, total: 7 },
  ],
};
let codigoCaja;
await prueba("registrar_venta_caja devuelve AMB-#####", async () => {
  codigoCaja = (await como(CAJA, () => uno("select registrar_venta_caja($1::jsonb) c", [JSON.stringify(venta)]))).c;
  if (!/^AMB-\d{5}$/.test(codigoCaja)) throw new Error("código inválido: " + codigoCaja);
});
await prueba("la venta entra en cocina, confirmada, con total 71 y descuenta stock", async () => {
  const p = await uno("select estado, canal, total::float, confirmado_en is not null conf, stock_descontado sd from pedidos where codigo=$1", [codigoCaja]);
  igual(p, { estado: "cocina", canal: "caja", total: 71, conf: true, sd: true });
  const s = await filas("select id, stock from productos where id in ('clasicas','papasbro') order by id");
  igual(s, [{ id: "clasicas", stock: 38 }, { id: "papasbro", stock: 24 }]);
});
await prueba("crea el cliente con teléfono normalizado", async () => {
  igual(await uno("select nombre, origen from clientes where telefono='51960111222'"), { nombre: "Valeria Ticona", origen: "Caja" });
});
await prueba("stock insuficiente → error y no descuenta nada", async () => {
  await debeFallar(
    como(CAJA, () => db.query("select registrar_venta_caja($1::jsonb)", [JSON.stringify({ items: [
      { productoId: "clasicas", qty: 1, total: 18, nombre: "x" },
      { productoId: "crispy", qty: 5, total: 100, nombre: "x" },
    ] })])),
    /Stock insuficiente de Alitas Crispy Bro/,
  );
  igual((await uno("select stock from productos where id='clasicas'")).stock, 38);
});
await prueba("cocina no puede registrar ventas", () =>
  debeFallar(como(COCINA, () => db.query("select registrar_venta_caja($1::jsonb)", [JSON.stringify(venta)])), /Solo admin o caja/));

// ---------------------------------------------------------------------------
console.log("\nEstados");
const idCaja = (await uno("select id from pedidos where codigo=$1", [codigoCaja])).id;
const cambiar = (uid, id, estado) => como(uid, () => uno("select (cambiar_estado_pedido($1, $2)).estado e", [id, estado]));

await prueba("cocina: cocina → listo", async () => igual(await cambiar(COCINA, idCaja, "listo"), { e: "listo" }));
await prueba("salón: listo → camino rechazado", () => debeFallar(cambiar(COCINA, idCaja, "camino"), /No se puede pasar/));
await prueba("cocina no puede cancelar", () => debeFallar(cambiar(COCINA, idCaja, "cancelado"), /No se puede pasar/));
await prueba("cocina no puede editar otras columnas", () =>
  debeFallar(como(COCINA, () => db.exec(`update pedidos set nota = 'gratis' where id = '${idCaja}'`)), /Cocina solo puede cambiar el estado/));
await prueba("cocina: listo → entregado (UPDATE directo) marca entregado_en", async () => {
  await como(COCINA, () => db.exec(`update pedidos set estado = 'entregado' where id = '${idCaja}'`));
  igual(await uno("select estado, entregado_en is not null ent from pedidos where id=$1", [idCaja]), { estado: "entregado", ent: true });
});
await prueba("entregado es final", () => debeFallar(cambiar(ADMIN, idCaja, "cancelado"), /No se puede pasar/));
await prueba("UPDATE directo con transición inválida también se rechaza", async () => {
  await debeFallar(como(CAJA, () => db.exec(`update pedidos set estado = 'nuevo' where id = '${idCaja}'`)), /No se puede pasar/);
});

// Pedidos web (como lo hace la Edge Function con service role)
async function pedidoWeb(extra = {}, items = null) {
  const ped = { cliente_nombre: "Bruno", telefono: "952000111", modalidad: "delivery", direccion: "Calle Zela 715", metodo_pago: "Plin", subtotal: 41, total: 41, ip_hash: "abc", ...extra };
  const its = items ?? [{ producto_id: "clasicas", presentacion_clave: "12", nombre: "Alitas Clásicas", detalle: "12 alitas · Salsas: Rocoto Tacneño", cantidad: 1, total: 41, salsas: ["rocoto"], detalle_json: { size: "12" } }];
  return como("service", () => uno("select * from insertar_pedido_web($1::jsonb, $2::jsonb)", [JSON.stringify(ped), JSON.stringify(its)]));
}

let web;
await prueba("insertar_pedido_web (service role) crea pedido nuevo", async () => {
  web = await pedidoWeb();
  igual(await uno("select estado, canal, stock_descontado sd from pedidos where id=$1", [web.id]), { estado: "nuevo", canal: "web", sd: false });
  igual((await uno("select origen from clientes where telefono='51952000111'")).origen, "Web");
});
await prueba("authenticated no puede llamar insertar_pedido_web", () =>
  debeFallar(como(CAJA, () => db.query("select insertar_pedido_web('{}'::jsonb, '[]'::jsonb)")), /permission denied/));
await prueba("nuevo → listo rechazado", () => debeFallar(cambiar(CAJA, web.id, "listo"), /No se puede pasar/));
await prueba("cocina no puede confirmar (nuevo → cocina)", () => debeFallar(cambiar(COCINA, web.id, "cocina"), /No se puede pasar/));
await prueba("caja confirma: nuevo → cocina descuenta stock y fija confirmado_en", async () => {
  igual(await cambiar(CAJA, web.id, "cocina"), { e: "cocina" });
  igual((await uno("select stock from productos where id='clasicas'")).stock, 37);
  igual(await uno("select confirmado_en is not null c, stock_descontado sd from pedidos where id=$1", [web.id]), { c: true, sd: true });
});
await prueba("delivery: listo → entregado rechazado; listo → camino → entregado", async () => {
  await cambiar(COCINA, web.id, "listo");
  await debeFallar(cambiar(COCINA, web.id, "entregado"), /No se puede pasar/);
  igual(await cambiar(COCINA, web.id, "camino"), { e: "camino" });
  igual(await cambiar(COCINA, web.id, "entregado"), { e: "entregado" });
});
await prueba("cancelar después de cocina repone el stock", async () => {
  const w = await pedidoWeb({}, [{ producto_id: "burger", presentacion_clave: "c", nombre: "Burger Bro", cantidad: 2, total: 50, salsas: [] }]);
  await cambiar(CAJA, w.id, "cocina");
  igual((await uno("select stock from productos where id='burger'")).stock, 10);
  igual(await cambiar(CAJA, w.id, "cancelado"), { e: "cancelado" });
  igual((await uno("select stock from productos where id='burger'")).stock, 12);
  await debeFallar(cambiar(ADMIN, w.id, "cocina"), /No se puede pasar/);
});
await prueba("nuevo → cancelado no toca el stock", async () => {
  const w = await pedidoWeb({ telefono: null });
  igual(await cambiar(CAJA, w.id, "cancelado"), { e: "cancelado" });
  igual((await uno("select stock from productos where id='clasicas'")).stock, 37);
});
await prueba("marcar_sin_respuesta: solo web en nuevo con más de 30 min", async () => {
  const viejo = await pedidoWeb({ telefono: null });
  await pedidoWeb({ telefono: null }); // reciente: no se toca
  await db.query("update pedidos set creado_en = now() - interval '31 minutes' where id = $1", [viejo.id]);
  igual((await como(CAJA, () => uno("select marcar_sin_respuesta() n"))).n, 1);
  igual((await uno("select estado from pedidos where id=$1", [viejo.id])).estado, "sin_respuesta");
  igual(await cambiar(CAJA, viejo.id, "cocina"), { e: "cocina" });
  await debeFallar(como(COCINA, () => db.query("select marcar_sin_respuesta()")), /No autorizado/);
});
await prueba("anon no puede cambiar estados", () =>
  debeFallar(como(null, () => db.query("select cambiar_estado_pedido($1, 'cocina')", [web.id])), /permission denied/));
await prueba("los códigos son correlativos", async () => {
  const r = await filas("select codigo from pedidos order by codigo");
  igual(r[0].codigo, "AMB-00001");
  if (!r.every((x) => /^AMB-\d{5}$/.test(x.codigo))) throw new Error("formato");
});

// ---------------------------------------------------------------------------
console.log("\nStock");
await prueba("ajustar_stock (caja) suma y nunca baja de 0", async () => {
  igual((await como(CAJA, () => uno("select ajustar_stock('crispy', 6) s"))).s, 10);
  igual((await como(ADMIN, () => uno("select ajustar_stock('crispy', -50) s"))).s, 0);
});
await prueba("cocina no puede ajustar stock", () =>
  debeFallar(como(COCINA, () => db.query("select ajustar_stock('crispy', 1)")), /Solo admin o caja/));
await prueba("producto inexistente", () =>
  debeFallar(como(ADMIN, () => db.query("select ajustar_stock('nada', 1)")), /Producto no encontrado/));

// ---------------------------------------------------------------------------
console.log("\nClientes y reseñas");
await prueba("clientes_resumen cuenta solo pedidos válidos", async () => {
  // Segunda venta de Valeria: 1 clásica con buffalo; y una cancelada que no debe contar.
  await como(CAJA, () => uno("select registrar_venta_caja($1::jsonb)", [JSON.stringify({ ...venta, items: [{ productoId: "clasicas", presentacionId: "6", nombre: "Alitas Clásicas", qty: 1, total: 18, salsas: ["buffalo"] }] })]));
  const c = (await como(CAJA, () => uno("select registrar_venta_caja($1::jsonb) c", [JSON.stringify({ ...venta, items: [{ productoId: "lunes", nombre: "Chaufa", qty: 1, total: 500, salsas: ["teriyaki", "teriyaki"] }] })]))).c;
  await como(CAJA, () => db.query("update pedidos set estado = 'cancelado' where codigo = $1", [c]));
  const r = await como(CAJA, () => uno("select nombre, pedidos, gastado::float, salsa_favorita, ultimo_pedido is not null u from clientes_resumen where telefono = '51960111222'"));
  igual(r, { nombre: "Valeria Ticona", pedidos: 2, gastado: 89, salsa_favorita: "Buffalo Picante", u: true });
});
await prueba("cocina no ve clientes", async () => {
  igual((await como(COCINA, () => uno("select count(*)::int n from clientes_resumen"))).n, 0);
});
await prueba("resenas: admin la ve, caja no", async () => {
  await db.query("insert into encuestas (pedido_id, token) values ($1, 'tok123')", [idCaja]);
  await db.query("insert into respuestas (encuesta_id, estrellas, origen, mejorar, comentario, invitado_google) select id, 5, 'TikTok', 'Rapidez', '¡Buenazas!', true from encuestas where token='tok123'");
  const r = await como(ADMIN, () => uno("select nombre, pedido, estrellas, texto, tema, invitado_google from resenas"));
  igual(r, { nombre: "Valeria Ticona", pedido: codigoCaja, estrellas: 5, texto: "¡Buenazas!", tema: "Rapidez", invitado_google: true });
  igual((await como(CAJA, () => uno("select count(*)::int n from resenas"))).n, 0);
});

console.log(`\n${ok} ok, ${fallas} con fallas`);
await db.close();
process.exit(fallas ? 1 : 0);
