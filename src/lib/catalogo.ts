/** Carta compartida con la landing (src/data/catalogo.json = misma fuente que el seed de la BD). */
import raw from "@/data/catalogo.json";
import type { Agregado, ProductoAdmin, Salsa } from "./tipos";

interface RawSize {
  id: string;
  label: string;
  price: number;
  units?: number;
}
interface RawGroup {
  id: string;
  maxBySize?: number[];
}
interface RawProduct {
  id: string;
  cat: string;
  name: string;
  img?: string;
  tile?: string;
  sizes: RawSize[];
  groups: RawGroup[];
}

export const CATEGORIAS: { id: string; label: string }[] = raw.categorias.filter((c) => c.id !== "todo");

export const etiquetaCategoria = (id: string) => CATEGORIAS.find((c) => c.id === id)?.label ?? id;

const STOCK_INICIAL: Record<string, number> = {
  clasicas: 40,
  crispy: 4,
  combo: 18,
  chaufa: 22,
  lunes: 15,
  burger: 12,
  limonada: 30,
  gaseosa: 3,
  papasbro: 25,
  alitas3: 40,
};

export const rutaImg = (src?: string | null) => (src ? (src.startsWith("/") || src.startsWith("data:") || src.startsWith("http") ? src : "/img/" + src.replace(/^assets\//, "")) : null);

export function productosIniciales(): ProductoAdmin[] {
  return (raw.productos as unknown as RawProduct[]).map((p, i) => ({
    id: p.id,
    nombre: p.name,
    categoria: p.cat,
    img: rutaImg(p.img),
    tile: p.tile ?? null,
    disponible: true,
    stock: STOCK_INICIAL[p.id] ?? 20,
    orden: i,
    salsasPorTamano: p.groups.find((g) => g.id === "salsas")?.maxBySize ?? [],
    presentaciones: p.sizes.map((s) => ({ id: s.id, label: s.label, precio: s.price, unidades: s.units ?? null })),
  }));
}

export function salsasIniciales(): Salsa[] {
  return raw.salsas.map((s) => ({ id: s.id, nombre: s.label, disponible: s.id !== "rocoto" }));
}

export function agregadosIniciales(): Agregado[] {
  return [
    ["papas", "Porción de papas", 5],
    ["cheddar", "Queso cheddar fundido", 4],
    ["salsa", "Pote de salsa extra", 2],
    ["carne", "Doble carne", 7],
    ["tocino", "Tocino extra", 3],
    ["huevo", "Huevo frito", 2],
    ["chaufa", "Arroz chaufa (acomp.)", 3],
  ].map(([id, nombre, precio]) => ({ id: id as string, nombre: nombre as string, precio: precio as number, disponible: true }));
}

/** Máximo de salsas para una presentación (ej. 12 alitas → 2). 0 si el producto no lleva salsas. */
export function maxSalsas(p: ProductoAdmin, presentacionId: string) {
  if (!p.salsasPorTamano.length) return 0;
  const i = Math.max(0, p.presentaciones.findIndex((z) => z.id === presentacionId));
  return p.salsasPorTamano[i] ?? p.salsasPorTamano[0];
}
