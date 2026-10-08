import type {
  Agregado,
  Ajustes,
  Cliente,
  EstadoPedido,
  NuevaPromo,
  NuevoPedido,
  Pedido,
  ProductoAdmin,
  Promo,
  Resena,
  Rol,
  Salsa,
  Usuario,
  ZonaDelivery,
} from "../tipos";

export type EventoDatos =
  | { tipo: "pedido_nuevo"; pedido?: Pedido }
  | { tipo: "pedido_cambio"; pedido?: Pedido }
  | { tipo: "catalogo" }
  | { tipo: "ajustes" };

/**
 * Capa de datos del panel. Dos implementaciones:
 * - `demo`: todo en el navegador (localStorage) con datos de ejemplo. Se usa si no hay variables de Supabase.
 * - `supabase`: Postgres + Auth + Realtime + Storage (supabase/migrations).
 */
export interface Api {
  modo: "demo" | "supabase";

  /* sesión */
  sesion(): Promise<Usuario | null>;
  login(p: { usuario: string; password: string; rol: Rol }): Promise<Usuario>;
  logout(): Promise<void>;

  /* pedidos */
  pedidos(desde: number): Promise<Pedido[]>;
  cambiarEstado(id: string, estado: EstadoPedido): Promise<void>;
  marcarPagado(id: string, pagado: boolean): Promise<void>;
  /** Venta de caja: entra a cocina y descuenta stock. Devuelve el código. */
  registrarVentaCaja(p: NuevoPedido): Promise<string>;
  /** Pedido pegado desde WhatsApp: entra como "nuevo" con pago por verificar. */
  crearPedidoManual(p: NuevoPedido): Promise<string>;
  /** Crea el enlace de encuesta de un pedido entregado. */
  crearEncuesta(pedidoId: string): Promise<string>;

  /* carta */
  productos(): Promise<ProductoAdmin[]>;
  actualizarProducto(id: string, patch: { disponible?: boolean; precios?: { id: string; precio: number }[] }): Promise<void>;
  ajustarStock(id: string, delta: number): Promise<number>;
  subirFoto(id: string, archivo: File): Promise<string>;
  salsas(): Promise<Salsa[]>;
  setSalsa(id: string, disponible: boolean): Promise<void>;
  agregados(): Promise<Agregado[]>;
  setAgregado(id: string, disponible: boolean): Promise<void>;

  /* crecimiento */
  promos(): Promise<Promo[]>;
  crearPromo(p: NuevaPromo): Promise<void>;
  setPromoActiva(id: string, activa: boolean): Promise<void>;
  clientes(): Promise<Cliente[]>;
  resenas(): Promise<Resena[]>;

  /* ajustes */
  ajustes(): Promise<Ajustes>;
  guardarAjustes(patch: Partial<Ajustes>): Promise<void>;
  zonas(): Promise<ZonaDelivery[]>;
  guardarZona(id: string, costo: number): Promise<void>;

  /** Cambios en vivo (pedidos nuevos, estados, carta). Devuelve la función para desuscribirse. */
  suscribir(cb: (e: EventoDatos) => void): () => void;
}
