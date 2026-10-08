/**
 * Modo real: Supabase (supabase/migrations). Las escrituras sensibles pasan por RPC
 * (cambiar_estado_pedido, registrar_venta_caja, ajustar_stock) que validan el rol en la BD.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { rutaImg } from "../catalogo";
import type {
  Agregado,
  Ajustes,
  Cliente,
  ItemPedido,
  Pedido,
  ProductoAdmin,
  Promo,
  Resena,
  Rol,
  Salsa,
  Usuario,
  ZonaDelivery,
} from "../tipos";
import type { Api, EventoDatos } from "./tipo";

/* Filas tal como vienen de Postgres */
interface FilaItem {
  nombre: string;
  detalle: string;
  cantidad: number;
  total: number | string;
  producto_id: string | null;
  presentacion_clave: string | null;
  salsas: string[] | null;
  orden: number;
}
interface FilaPedido {
  id: string;
  codigo: string;
  cliente_nombre: string;
  telefono: string | null;
  canal: Pedido["canal"];
  modalidad: Pedido["modalidad"];
  direccion: string;
  metodo_pago: string;
  pagado: boolean;
  estado: Pedido["estado"];
  nota: string;
  cupon: string | null;
  descuento: number | string;
  total: number | string;
  creado_en: string;
  entregado_en: string | null;
  pedido_items?: FilaItem[];
}

const n = (x: number | string | null | undefined) => Number(x ?? 0);
const hhmm = (t: string | null | undefined) => (t ?? "").slice(0, 5);

function aPedido(f: FilaPedido): Pedido {
  const items: ItemPedido[] = (f.pedido_items ?? [])
    .sort((a, b) => a.orden - b.orden)
    .map((i) => ({
      qty: i.cantidad,
      nombre: i.nombre,
      detalle: i.detalle,
      total: n(i.total),
      productoId: i.producto_id,
      presentacionId: i.presentacion_clave,
      salsas: i.salsas ?? [],
    }));
  return {
    id: f.id,
    codigo: f.codigo,
    cliente: f.cliente_nombre,
    telefono: f.telefono ?? "",
    canal: f.canal,
    modalidad: f.modalidad,
    direccion: f.direccion,
    pago: f.metodo_pago,
    pagado: f.pagado,
    estado: f.estado,
    nota: f.nota,
    cupon: f.cupon,
    descuento: n(f.descuento),
    total: n(f.total),
    items,
    creadoEn: Date.parse(f.creado_en),
    entregadoEn: f.entregado_en ? Date.parse(f.entregado_en) : null,
  };
}

const SELECT_PEDIDO =
  "id,codigo,cliente_nombre,telefono,canal,modalidad,direccion,metodo_pago,pagado,estado,nota,cupon,descuento,total,creado_en,entregado_en,pedido_items(nombre,detalle,cantidad,total,producto_id,presentacion_clave,salsas,orden)";

function fallo(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function crearSupabaseApi(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: true, storageKey: "alamibro-admin-auth" } });

  async function perfil(): Promise<Usuario | null> {
    const { data: s } = await sb.auth.getSession();
    const user = s.session?.user;
    if (!user) return null;
    const { data, error } = await sb.from("perfiles").select("id,nombre,rol").eq("id", user.id).maybeSingle();
    if (error || !data) return null;
    return { id: data.id, nombre: data.nombre || user.email || "Equipo", rol: data.rol as Rol, email: user.email ?? undefined };
  }

  async function insertarPedido(p: Parameters<Api["crearPedidoManual"]>[0]): Promise<string> {
    const total = p.items.reduce((a, i) => a + i.total, 0);
    const { data, error } = await sb
      .from("pedidos")
      .insert({
        cliente_nombre: p.cliente,
        telefono: p.telefono || null,
        canal: p.canal,
        modalidad: p.modalidad,
        direccion: p.direccion,
        metodo_pago: p.pago,
        pagado: p.pagado,
        estado: "nuevo",
        nota: p.nota,
        subtotal: total,
        total,
      })
      .select("id,codigo")
      .single();
    fallo(error);
    const items = p.items.map((i, k) => ({
      pedido_id: data!.id,
      producto_id: i.productoId ?? null,
      presentacion_clave: i.presentacionId ?? null,
      nombre: i.nombre,
      detalle: i.detalle,
      cantidad: i.qty,
      total: i.total,
      salsas: i.salsas ?? [],
      orden: k,
    }));
    const r = await sb.from("pedido_items").insert(items);
    fallo(r.error);
    return data!.codigo as string;
  }

  return {
    modo: "supabase",

    sesion: perfil,
    async login({ usuario, password }) {
      const { error } = await sb.auth.signInWithPassword({ email: usuario.trim(), password });
      if (error) throw new Error("Correo o contraseña incorrectos.");
      const u = await perfil();
      if (!u) {
        await sb.auth.signOut();
        throw new Error("Tu usuario no tiene un rol asignado. Pide al administrador que te agregue en «perfiles».");
      }
      return u;
    },
    async logout() {
      await sb.auth.signOut();
    },

    async pedidos(desde) {
      const out: Pedido[] = [];
      // Paginado de 1000 en 1000 (límite por defecto de PostgREST).
      for (let page = 0; page < 20; page++) {
        const { data, error } = await sb
          .from("pedidos")
          .select(SELECT_PEDIDO)
          .gte("creado_en", new Date(desde).toISOString())
          .order("creado_en", { ascending: true })
          .range(page * 1000, page * 1000 + 999);
        fallo(error);
        out.push(...((data ?? []) as unknown as FilaPedido[]).map(aPedido));
        if ((data ?? []).length < 1000) break;
      }
      return out;
    },
    async cambiarEstado(id, estado) {
      const { error } = await sb.rpc("cambiar_estado_pedido", { p_id: id, p_estado: estado });
      fallo(error);
    },
    async marcarPagado(id, pagado) {
      const { error } = await sb.from("pedidos").update({ pagado }).eq("id", id);
      fallo(error);
    },
    async registrarVentaCaja(p) {
      const { data, error } = await sb.rpc("registrar_venta_caja", {
        p: {
          cliente: p.cliente,
          telefono: p.telefono,
          modalidad: p.modalidad,
          direccion: p.direccion,
          pago: p.pago,
          pagado: p.pagado,
          nota: p.nota,
          items: p.items.map((i) => ({
            productoId: i.productoId,
            presentacionId: i.presentacionId,
            nombre: i.nombre,
            detalle: i.detalle,
            qty: i.qty,
            total: i.total,
            salsas: i.salsas ?? [],
          })),
        },
      });
      fallo(error);
      return data as string;
    },
    crearPedidoManual: insertarPedido,
    async crearEncuesta(pedidoId) {
      const { data, error } = await sb.functions.invoke<{ url: string }>("encuesta", { body: { accion: "crear", pedidoId } });
      fallo(error);
      return data!.url;
    },

    async productos() {
      const { data, error } = await sb
        .from("productos")
        .select("id,nombre,categoria_id,imagen,tile,disponible,stock,orden,presentaciones(clave,etiqueta,precio,unidades,orden),grupos_opciones(clave,max_por_presentacion)")
        .order("orden");
      fallo(error);
      type F = {
        id: string;
        nombre: string;
        categoria_id: string;
        imagen: string | null;
        tile: string | null;
        disponible: boolean;
        stock: number;
        orden: number;
        presentaciones: { clave: string; etiqueta: string; precio: number | string; unidades: number | null; orden: number }[];
        grupos_opciones: { clave: string; max_por_presentacion: number[] | null }[];
      };
      return ((data ?? []) as F[]).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria_id,
        img: rutaImg(p.imagen),
        tile: p.tile,
        disponible: p.disponible,
        stock: p.stock,
        orden: p.orden,
        salsasPorTamano: p.grupos_opciones.find((g) => g.clave === "salsas")?.max_por_presentacion ?? [],
        presentaciones: p.presentaciones
          .sort((a, b) => a.orden - b.orden)
          .map((z) => ({ id: z.clave, label: z.etiqueta, precio: n(z.precio), unidades: z.unidades })),
      })) satisfies ProductoAdmin[];
    },
    async actualizarProducto(id, patch) {
      if (patch.disponible !== undefined) {
        const { error } = await sb.from("productos").update({ disponible: patch.disponible }).eq("id", id);
        fallo(error);
      }
      for (const z of patch.precios ?? []) {
        const { error } = await sb.from("presentaciones").update({ precio: z.precio }).eq("producto_id", id).eq("clave", z.id);
        fallo(error);
      }
    },
    async ajustarStock(id, delta) {
      const { data, error } = await sb.rpc("ajustar_stock", { p_producto: id, p_delta: delta });
      fallo(error);
      return data as number;
    },
    async subirFoto(id, archivo) {
      const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase();
      const ruta = `${id}/${Date.now()}.${ext}`;
      const up = await sb.storage.from("productos").upload(ruta, archivo, { upsert: true, contentType: archivo.type });
      fallo(up.error);
      const url = sb.storage.from("productos").getPublicUrl(ruta).data.publicUrl;
      const { error } = await sb.from("productos").update({ imagen: url }).eq("id", id);
      fallo(error);
      return url;
    },
    async salsas() {
      const { data, error } = await sb.from("salsas").select("id,nombre,disponible").order("orden");
      fallo(error);
      return (data ?? []) as Salsa[];
    },
    async setSalsa(id, disponible) {
      const { error } = await sb.from("salsas").update({ disponible }).eq("id", id);
      fallo(error);
    },
    async agregados() {
      const { data, error } = await sb.from("agregados").select("id,nombre,precio,disponible").order("orden");
      fallo(error);
      return ((data ?? []) as Agregado[]).map((a) => ({ ...a, precio: n(a.precio) }));
    },
    async setAgregado(id, disponible) {
      const { error } = await sb.from("agregados").update({ disponible }).eq("id", id);
      fallo(error);
    },

    async promos() {
      const { data, error } = await sb.from("promos").select("id,nombre,tipo,valor,dias,desde,hasta,alcance,codigo_cupon,activa").order("creado_en");
      fallo(error);
      type F = { id: string; nombre: string; tipo: Promo["tipo"]; valor: number | string | null; dias: number[]; desde: string; hasta: string; alcance: string; codigo_cupon: string | null; activa: boolean };
      return ((data ?? []) as F[]).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        valor: p.valor === null ? null : n(p.valor),
        dias: p.dias,
        desde: hhmm(p.desde),
        hasta: hhmm(p.hasta),
        alcance: p.alcance,
        codigo: p.codigo_cupon,
        activa: p.activa,
      }));
    },
    async crearPromo(p) {
      const { error } = await sb.from("promos").insert({
        nombre: p.nombre,
        tipo: p.tipo,
        valor: p.valor,
        dias: p.dias,
        desde: p.desde,
        hasta: p.hasta,
        alcance: p.alcance,
        codigo_cupon: p.codigo || null,
        activa: p.activa,
      });
      if (error?.code === "23505") throw new Error("Ya existe un cupón con ese código");
      fallo(error);
    },
    async setPromoActiva(id, activa) {
      const { error } = await sb.from("promos").update({ activa }).eq("id", id);
      fallo(error);
    },
    async clientes() {
      const { data, error } = await sb
        .from("clientes_resumen")
        .select("id,nombre,telefono,origen,pedidos,gastado,ultimo_pedido,salsa_favorita")
        .order("gastado", { ascending: false });
      fallo(error);
      type F = { id: string; nombre: string; telefono: string | null; origen: string; pedidos: number; gastado: number | string; ultimo_pedido: string | null; salsa_favorita: string | null };
      return ((data ?? []) as F[]).map(
        (c): Cliente => ({
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono ?? "",
          origen: c.origen || "—",
          pedidos: Number(c.pedidos),
          gastado: n(c.gastado),
          ultimoPedido: c.ultimo_pedido ? Date.parse(c.ultimo_pedido) : null,
          salsaFavorita: c.salsa_favorita ?? "—",
        })
      );
    },
    async resenas() {
      const { data, error } = await sb
        .from("resenas")
        .select("id,nombre,telefono,pedido,fecha,estrellas,texto,origen,tema,invitado_google")
        .order("fecha", { ascending: false })
        .limit(200);
      fallo(error);
      type F = { id: string; nombre: string; telefono: string | null; pedido: string; fecha: string; estrellas: number; texto: string | null; origen: string | null; tema: string | null; invitado_google: boolean };
      return ((data ?? []) as F[]).map(
        (r): Resena => ({
          id: r.id,
          nombre: r.nombre,
          telefono: r.telefono ?? "",
          pedido: r.pedido,
          fecha: Date.parse(r.fecha),
          estrellas: r.estrellas,
          texto: r.texto ?? "",
          origen: r.origen ?? "",
          tema: r.tema ?? "",
          invitadoGoogle: r.invitado_google,
        })
      );
    },

    async ajustes() {
      const { data, error } = await sb.from("ajustes_tienda").select("*").eq("id", 1).single();
      fallo(error);
      return {
        tiendaAbierta: data.tienda_abierta,
        abre: hhmm(data.abre),
        cierra: hhmm(data.cierra),
        whatsapp: data.whatsapp,
        yape: data.yape,
        plin: data.plin,
        direccion: data.direccion,
        encuesta: data.encuesta ?? [],
      } satisfies Ajustes;
    },
    async guardarAjustes(patch) {
      const fila: Record<string, unknown> = {};
      if (patch.tiendaAbierta !== undefined) fila.tienda_abierta = patch.tiendaAbierta;
      if (patch.abre !== undefined) fila.abre = patch.abre;
      if (patch.cierra !== undefined) fila.cierra = patch.cierra;
      if (patch.whatsapp !== undefined) fila.whatsapp = patch.whatsapp;
      if (patch.yape !== undefined) fila.yape = patch.yape;
      if (patch.plin !== undefined) fila.plin = patch.plin;
      if (patch.direccion !== undefined) fila.direccion = patch.direccion;
      if (patch.encuesta !== undefined) fila.encuesta = patch.encuesta;
      const { error } = await sb.from("ajustes_tienda").update(fila).eq("id", 1);
      fallo(error);
    },
    async zonas() {
      const { data, error } = await sb.from("zonas_delivery").select("id,nombre,costo").order("orden");
      fallo(error);
      return ((data ?? []) as ZonaDelivery[]).map((z) => ({ ...z, costo: n(z.costo) }));
    },
    async guardarZona(id, costo) {
      const { error } = await sb.from("zonas_delivery").update({ costo }).eq("id", id);
      fallo(error);
    },

    suscribir(cb: (e: EventoDatos) => void) {
      const ch = sb
        .channel("panel-pedidos")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos" }, (m) =>
          cb({ tipo: "pedido_nuevo", pedido: aPedido(m.new as FilaPedido) })
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, (m) =>
          cb({ tipo: "pedido_cambio", pedido: aPedido(m.new as FilaPedido) })
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () => cb({ tipo: "catalogo" }))
        .on("postgres_changes", { event: "*", schema: "public", table: "ajustes_tienda" }, () => cb({ tipo: "ajustes" }))
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}
