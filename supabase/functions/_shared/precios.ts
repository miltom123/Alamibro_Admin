/**
 * Reglas de precios del servidor. Port 1:1 de la landing (alamibro-web/lib/reglas/precios.ts)
 * más la validación de una línea de pedido. TypeScript puro (sin APIs de Deno) para poder
 * probarlo con Vitest desde el panel admin: tests/unit/backend-precios.test.ts.
 */

export type TipoGrupo = "single" | "multi" | "qty";

export interface Opcion {
  id: string;
  label: string;
  price: number;
  img?: string;
  tag?: string;
}

export interface Grupo {
  id: string;
  title: string;
  short: string;
  type: TipoGrupo;
  required: boolean;
  min?: number;
  max?: number;
  maxBySize?: number[];
  need?: string;
  zero?: string;
  options: Opcion[];
}

export interface Presentacion {
  id: string;
  label: string;
  price: number;
  units?: number;
  tag?: string;
}

export interface Producto {
  id: string;
  cat: string;
  name: string;
  desc: string;
  badge?: string;
  img?: string;
  icon?: string;
  tile?: string;
  promo?: boolean;
  sizes: Presentacion[];
  groups: Grupo[];
  /** Solo en el servidor (vienen de la BD). */
  disponible?: boolean;
  stock?: number;
}

/** Elecciones por grupo: single → id | null, multi → id[], qty → { id: cantidad } */
export type Eleccion = string | null | string[] | Record<string, number>;
export type Elecciones = Record<string, Eleccion>;

export interface Seleccion {
  size: string;
  choices: Elecciones;
  qty: number;
  note: string;
}

export const MAX_CANTIDAD = 20;

export const money = (n: number) => "S/ " + n.toFixed(2);

/** Redondeo a céntimos para evitar errores de coma flotante. */
export const redondear = (n: number) => Math.round(n * 100) / 100;

/** Máximo de opciones de un grupo multi. Salsas: 6 → 1, 12 → 2, 18 → 3. */
export function maxDelGrupo(g: Grupo, p: Producto, sizeId: string): number {
  if (g.maxBySize && g.maxBySize.length) {
    const i = Math.max(0, p.sizes.findIndex((s) => s.id === sizeId));
    return g.maxBySize[i] || g.maxBySize[0];
  }
  return g.max || 1;
}

export function grupoCompleto(g: Grupo, c: Eleccion | undefined): boolean {
  if (g.type === "single") return !!c;
  if (g.type === "multi") return ((c as string[]) || []).length >= (g.min || 0);
  return true;
}

/** Primer paso obligatorio sin completar (o undefined si todo está listo). */
export const pasoFaltante = (p: Producto, choices: Elecciones) =>
  p.groups.find((g) => g.required && !grupoCompleto(g, choices[g.id]));

/**
 * Precio unitario = presentación + extras single/multi + (precio × cantidad) de opciones qty.
 * El total de la línea es este valor × cantidad.
 */
export function precioUnitario(p: Producto, sel: Pick<Seleccion, "size" | "choices">): number {
  const size = p.sizes.find((s) => s.id === sel.size) || p.sizes[0];
  let t = size.price;
  p.groups.forEach((g) => {
    const c = sel.choices[g.id];
    const precio = (id: string) => (g.options.find((o) => o.id === id) || { price: 0 }).price;
    if (g.type === "single" && c) t += precio(c as string);
    if (g.type === "multi") ((c as string[]) || []).forEach((id) => (t += precio(id)));
    if (g.type === "qty") {
      const m = (c as Record<string, number>) || {};
      Object.keys(m).forEach((id) => (t += precio(id) * m[id]));
    }
  });
  return t;
}

/** Líneas de detalle legibles (idénticas a las de la landing y el mensaje de WhatsApp). */
export function detalle(p: Producto, l: Pick<Seleccion, "size" | "choices" | "note">): string[] {
  const parts: string[] = [];
  const size = p.sizes.find((s) => s.id === l.size) || p.sizes[0];
  if (p.sizes.length > 1) parts.push(size.label);
  p.groups.forEach((g) => {
    const c = l.choices[g.id];
    const lab = (id: string) => (g.options.find((o) => o.id === id) || { label: id }).label;
    if (g.type === "single" && c) parts.push(g.short + ": " + lab(c as string));
    if (g.type === "multi" && Array.isArray(c) && c.length)
      parts.push(g.id === "quitar" ? c.map(lab).join(", ") : g.short + ": " + c.map(lab).join(", "));
    if (g.type === "qty") {
      const m = (c as Record<string, number>) || {};
      Object.keys(m).forEach((id) => {
        if (m[id] > 0) parts.push(m[id] + "× " + lab(id));
      });
    }
  });
  if (l.note) parts.push("Nota: " + l.note);
  return parts;
}

/** Salsas elegidas en la línea (grupo "salsas"). */
export const salsasDeLinea = (choices: Elecciones): string[] =>
  Array.isArray(choices.salsas) ? (choices.salsas as string[]) : [];

const esEntero = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

export interface OpcionesValidacion {
  /** Ids de salsas marcadas como no disponibles en la tabla salsas. */
  salsasNoDisponibles?: Set<string>;
}

/**
 * Valida una línea contra la carta. Devuelve el mensaje de error (en español) o null si es válida.
 * Normaliza `choices` en el lugar: rellena grupos ausentes y quita cantidades en 0.
 */
export function validarSeleccion(p: Producto, sel: Seleccion, o: OpcionesValidacion = {}): string | null {
  if (!p.sizes.some((s) => s.id === sel.size)) return `${p.name}: presentación no válida`;
  if (!esEntero(sel.qty) || sel.qty < 1 || sel.qty > MAX_CANTIDAD)
    return `${p.name}: la cantidad debe estar entre 1 y ${MAX_CANTIDAD}`;

  // Grupos que el producto no tiene se descartan.
  for (const k of Object.keys(sel.choices)) if (!p.groups.some((g) => g.id === k)) delete sel.choices[k];

  for (const g of p.groups) {
    const c = sel.choices[g.id];
    const existe = (id: unknown) => typeof id === "string" && g.options.some((op) => op.id === id);
    const etiqueta = (id: string) => g.options.find((op) => op.id === id)?.label ?? id;

    if (g.type === "single") {
      if (c === undefined || c === null || c === "") {
        sel.choices[g.id] = null;
      } else if (!existe(c)) {
        return `${p.name}: opción no válida en "${g.title}"`;
      }
    } else if (g.type === "multi") {
      if (c === undefined || c === null) {
        sel.choices[g.id] = [];
        continue;
      }
      if (!Array.isArray(c) || !c.every(existe)) return `${p.name}: opción no válida en "${g.title}"`;
      if (new Set(c).size !== c.length) return `${p.name}: opción repetida en "${g.title}"`;
      const max = maxDelGrupo(g, p, sel.size);
      if (c.length > max)
        return g.id === "salsas"
          ? `${p.name}: puedes elegir máximo ${max} ${max === 1 ? "salsa" : "salsas"} en esta presentación`
          : `${p.name}: máximo ${max} opciones en "${g.title}"`;
      if (g.id === "salsas" && o.salsasNoDisponibles) {
        const agotada = c.find((id) => o.salsasNoDisponibles!.has(id));
        if (agotada) return `La salsa ${etiqueta(agotada)} no está disponible hoy`;
      }
    } else {
      if (c === undefined || c === null) {
        sel.choices[g.id] = {};
        continue;
      }
      if (typeof c !== "object" || Array.isArray(c)) return `${p.name}: opción no válida en "${g.title}"`;
      const m = c as Record<string, number>;
      for (const id of Object.keys(m)) {
        if (!existe(id)) return `${p.name}: opción no válida en "${g.title}"`;
        if (!esEntero(m[id]) || m[id] < 0 || m[id] > MAX_CANTIDAD)
          return `${p.name}: cantidad no válida en "${g.title}"`;
        if (m[id] === 0) delete m[id];
      }
    }
  }

  const falta = pasoFaltante(p, sel.choices);
  if (falta) return `${p.name}: ${falta.need || "completa " + falta.title.toLowerCase()}`;
  return null;
}
