import cfg from "@/data/admin-config.json";
import type { EstadoPedido, Modalidad, Pantalla, Rol } from "./tipos";

export interface InfoPantalla {
  label: string;
  glyph: string;
  title: string;
  sub: string;
}

export const PANTALLAS = cfg.pantallas as Record<Pantalla, InfoPantalla>;

export const ROLES = cfg.roles as Record<Rol, { label: string; initial: string; hint: string; screens: Pantalla[] }>;

export const NAV: { title: string; items: Pantalla[] }[] = [
  { title: "OPERACIÓN", items: ["inicio", "pedidos", "caja"] },
  { title: "CARTA", items: ["carta"] },
  { title: "CRECIMIENTO", items: ["promos", "clientes", "resenas"] },
  { title: "ANÁLISIS Y AJUSTES", items: ["reportes", "ajustes"] },
];

export const COLUMNAS: EstadoPedido[] = ["nuevo", "cocina", "listo", "camino", "entregado"];

export const COL_META = cfg.columnas_kds as Record<
  "nuevo" | "cocina" | "listo" | "camino" | "entregado",
  { title: string; sub: string; color: string }
>;

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  nuevo: "Nuevos",
  cocina: "En cocina",
  listo: "Listos",
  camino: "En camino",
  entregado: "Entregados",
  cancelado: "Cancelado",
  sin_respuesta: "Sin respuesta",
};

export const MODO_LABEL: Record<Modalidad, string> = { delivery: "Delivery", recojo: "Recojo", salon: "Salón" };

export const puedeVer = (rol: Rol, p: Pantalla) => ROLES[rol].screens.includes(p);

export const LANDING_URL = import.meta.env.VITE_LANDING_URL || "https://alamibro.pe";

/** Pedido atrasado: más de 25 min sin entregar. Ámbar desde 15. Sin respuesta: web > 30 min en "nuevo". */
export const MIN_ATRASO = 25;
export const MIN_AVISO = 15;
export const MIN_SIN_RESPUESTA = 30;
export const STOCK_BAJO = 5;
export const DIAS_PROMO_3X2 = [1, 4, 0];
