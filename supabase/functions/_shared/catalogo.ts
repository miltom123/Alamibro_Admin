/**
 * Convierte las filas de la BD (productos + presentaciones + grupos_opciones + opciones)
 * al tipo Producto de la landing. TypeScript puro.
 */
import type { Grupo, Producto, TipoGrupo } from "./precios.ts";

export interface FilaOpcion {
  clave: string;
  etiqueta: string;
  precio_extra: number | string;
  imagen: string | null;
  etiqueta_destacada: string | null;
  orden: number;
}

export interface FilaGrupo {
  clave: string;
  titulo: string;
  corto: string;
  tipo: TipoGrupo;
  obligatorio: boolean;
  min: number | null;
  max: number | null;
  max_por_presentacion: number[] | null;
  aviso: string | null;
  texto_cero: string | null;
  orden: number;
  opciones: FilaOpcion[] | null;
}

export interface FilaPresentacion {
  clave: string;
  etiqueta: string;
  precio: number | string;
  unidades: number | null;
  tag: string | null;
  orden: number;
}

export interface FilaProducto {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string;
  badge: string | null;
  imagen: string | null;
  icono: string | null;
  tile: string | null;
  es_promo_3x2: boolean;
  disponible: boolean;
  stock: number;
  orden: number;
  presentaciones: FilaPresentacion[] | null;
  grupos_opciones: FilaGrupo[] | null;
}

/** Columnas para `supabase.from("productos").select(SELECT_PRODUCTOS)`. */
export const SELECT_PRODUCTOS =
  "id, categoria_id, nombre, descripcion, badge, imagen, icono, tile, es_promo_3x2, disponible, stock, orden," +
  " presentaciones(clave, etiqueta, precio, unidades, tag, orden)," +
  " grupos_opciones(clave, titulo, corto, tipo, obligatorio, min, max, max_por_presentacion, aviso, texto_cero, orden," +
  " opciones(clave, etiqueta, precio_extra, imagen, etiqueta_destacada, orden))";

const porOrden = <T extends { orden: number }>(a: T[] | null | undefined) => [...(a ?? [])].sort((x, y) => x.orden - y.orden);
const opt = <T>(v: T | null | undefined) => (v === null || v === undefined ? undefined : v);

export function productoDesdeFila(f: FilaProducto): Producto {
  return {
    id: f.id,
    cat: f.categoria_id,
    name: f.nombre,
    desc: f.descripcion ?? "",
    badge: opt(f.badge),
    img: opt(f.imagen),
    icon: opt(f.icono),
    tile: opt(f.tile),
    promo: f.es_promo_3x2,
    disponible: f.disponible,
    stock: f.stock,
    sizes: porOrden(f.presentaciones).map((s) => ({
      id: s.clave,
      label: s.etiqueta,
      price: Number(s.precio),
      units: opt(s.unidades),
      tag: opt(s.tag),
    })),
    groups: porOrden(f.grupos_opciones).map(
      (g): Grupo => ({
        id: g.clave,
        title: g.titulo,
        short: g.corto,
        type: g.tipo,
        required: g.obligatorio,
        min: opt(g.min),
        max: opt(g.max),
        maxBySize: g.max_por_presentacion?.length ? g.max_por_presentacion : undefined,
        need: opt(g.aviso),
        zero: opt(g.texto_cero),
        options: porOrden(g.opciones).map((o) => ({
          id: o.clave,
          label: o.etiqueta,
          price: Number(o.precio_extra),
          img: opt(o.imagen),
          tag: opt(o.etiqueta_destacada),
        })),
      }),
    ),
  };
}
