/**
 * Modelo de dominio del panel. Es el contrato entre la interfaz y la capa de datos
 * (modo demo en el navegador o Supabase). Los nombres de columnas SQL están en
 * supabase/migrations y se mapean en src/lib/api/supabase.ts.
 */

export type Rol = "admin" | "caja" | "cocina";

export type Pantalla =
  | "inicio"
  | "pedidos"
  | "caja"
  | "carta"
  | "promos"
  | "clientes"
  | "resenas"
  | "reportes"
  | "ajustes";

/** Estados del pedido. `nuevo` = llegó y espera confirmación (en la web: pendiente de WhatsApp). */
export type EstadoPedido =
  | "nuevo"
  | "cocina"
  | "listo"
  | "camino"
  | "entregado"
  | "cancelado"
  | "sin_respuesta";

export type Canal = "web" | "caja";
export type Modalidad = "delivery" | "recojo" | "salon";
export type MetodoPago = "Yape" | "Plin" | "Efectivo" | "Tarjeta";

export interface ItemPedido {
  qty: number;
  nombre: string;
  detalle: string;
  total: number;
  productoId?: string | null;
  presentacionId?: string | null;
  salsas?: string[];
}

export interface Pedido {
  id: string;
  codigo: string;
  cliente: string;
  telefono: string;
  canal: Canal;
  modalidad: Modalidad;
  direccion: string;
  pago: MetodoPago | string;
  pagado: boolean;
  estado: EstadoPedido;
  nota: string;
  cupon?: string | null;
  descuento?: number;
  total: number;
  items: ItemPedido[];
  creadoEn: number; // epoch ms
  entregadoEn?: number | null;
}

export interface NuevoPedido {
  cliente: string;
  telefono: string;
  canal: Canal;
  modalidad: Modalidad;
  direccion: string;
  pago: MetodoPago | string;
  pagado: boolean;
  estado: EstadoPedido;
  nota: string;
  items: ItemPedido[];
}

export interface PresentacionAdmin {
  id: string;
  label: string;
  precio: number;
  unidades?: number | null;
}

export interface ProductoAdmin {
  id: string;
  nombre: string;
  categoria: string; // id de categoría (alitas, combos…)
  img?: string | null;
  tile?: string | null;
  disponible: boolean;
  stock: number;
  orden: number;
  /** Máximo de salsas por presentación (vacío si el producto no lleva salsas). */
  salsasPorTamano: number[];
  presentaciones: PresentacionAdmin[];
}

export interface Salsa {
  id: string;
  nombre: string;
  disponible: boolean;
}

export interface Agregado {
  id: string;
  nombre: string;
  precio: number;
  disponible: boolean;
}

export type TipoPromo = "porc" | "monto" | "3x2" | "precio";

export interface Promo {
  id: string;
  nombre: string;
  tipo: TipoPromo;
  valor: number | null;
  dias: number[]; // 0 = domingo … 6 = sábado
  desde: string; // "17:00"
  hasta: string; // "23:30"
  alcance: string; // "Toda la carta" | "Alitas" | …
  codigo: string | null;
  activa: boolean;
}

export type NuevaPromo = Omit<Promo, "id">;

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  origen: string;
  pedidos: number;
  gastado: number;
  ultimoPedido: number | null; // epoch ms
  salsaFavorita: string;
}

export type Segmento = "VIP" | "Frecuente" | "Nuevo" | "Inactivo";

export interface Resena {
  id: string;
  nombre: string;
  telefono: string;
  pedido: string; // código
  fecha: number;
  estrellas: number;
  texto: string;
  origen: string;
  tema: string;
  invitadoGoogle: boolean;
}

export interface PreguntaEncuesta {
  id: string;
  label: string;
  activa: boolean;
}

export interface Ajustes {
  tiendaAbierta: boolean;
  abre: string;
  cierra: string;
  whatsapp: string;
  yape: string;
  plin: string;
  direccion: string;
  encuesta: PreguntaEncuesta[];
}

export interface ZonaDelivery {
  id: string;
  nombre: string;
  costo: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  email?: string;
}
