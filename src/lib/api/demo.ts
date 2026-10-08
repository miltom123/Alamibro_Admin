/**
 * Modo demo: los datos viven en el navegador (localStorage) y se sincronizan entre pestañas.
 * Imita las reglas de la base de datos (transiciones, stock al pasar a cocina, códigos AMB-#####)
 * para que el equipo pueda probar el panel antes de conectar Supabase.
 */
import { normalizarTelefono } from "../formato";
import { transicionPermitida } from "../reglas";
import type { Cliente, NuevoPedido, Pedido, Rol, Usuario } from "../tipos";
import { estadoInicial, type EstadoDemo } from "./demo-seed";
import type { Api, EventoDatos } from "./tipo";

const CLAVE = "alamibro-admin-demo-v1";
const CLAVE_SESION = "alamibro-admin-sesion";

let estado: EstadoDemo | null = null;
const oyentes = new Set<(e: EventoDatos) => void>();
const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("alamibro-demo") : null;

canal?.addEventListener("message", (ev) => {
  estado = null; // otra pestaña cambió los datos: se vuelven a leer
  oyentes.forEach((cb) => cb(ev.data as EventoDatos));
});

function leer(): EstadoDemo {
  if (estado) return estado;
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const s = JSON.parse(raw) as EstadoDemo;
      if (s.version === 1) return (estado = s);
    }
  } catch {
    /* sin almacenamiento: se usa memoria */
  }
  estado = estadoInicial();
  guardar();
  return estado;
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    /* lleno o bloqueado: seguimos en memoria */
  }
}

function emitir(e: EventoDatos) {
  guardar();
  oyentes.forEach((cb) => cb(e));
  canal?.postMessage(e);
}

const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function rolActual(): Rol {
  try {
    const u = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null") as Usuario | null;
    return u?.rol ?? "admin";
  } catch {
    return "admin";
  }
}

function siguienteCodigo(s: EstadoDemo) {
  return "AMB-" + String(s.secuencia++).padStart(5, "0");
}

/** Descuenta (o devuelve) el stock de los productos de un pedido. */
function moverStock(s: EstadoDemo, p: Pedido, signo: -1 | 1) {
  p.items.forEach((it) => {
    const prod = it.productoId ? s.productos.find((x) => x.id === it.productoId) : undefined;
    if (prod) prod.stock = Math.max(0, prod.stock + signo * it.qty);
  });
}

function nuevoPedido(s: EstadoDemo, p: NuevoPedido): Pedido {
  return {
    id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    codigo: siguienteCodigo(s),
    ...p,
    telefono: normalizarTelefono(p.telefono),
    total: p.items.reduce((a, i) => a + i.total, 0),
    creadoEn: Date.now(),
    entregadoEn: null,
  };
}

export const demoApi: Api = {
  modo: "demo",

  async sesion() {
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null");
    } catch {
      return null;
    }
  },
  async login({ usuario, password, rol }) {
    await espera(700);
    if (usuario.trim().length < 3 || password.length < 4)
      throw new Error("Revisa tu usuario (3+ letras) y contraseña (4+ caracteres).");
    const nombre = usuario.trim();
    const u: Usuario = { id: "demo-" + rol, nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), rol };
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(u));
    } catch {
      /* sin sessionStorage */
    }
    return u;
  },
  async logout() {
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* nada */
    }
  },

  async pedidos(desde) {
    await espera(60);
    return clonar(leer().pedidos.filter((p) => p.creadoEn >= desde));
  },
  async cambiarEstado(id, nuevo) {
    const s = leer();
    const p = s.pedidos.find((x) => x.id === id);
    if (!p) throw new Error("Pedido no encontrado");
    if (!transicionPermitida(p.estado, nuevo, p.modalidad, rolActual()))
      throw new Error(`No se puede pasar el pedido de "${p.estado}" a "${nuevo}"`);
    if (nuevo === "cocina" && !s.descontados.includes(p.id)) {
      moverStock(s, p, -1);
      s.descontados.push(p.id);
    }
    if (nuevo === "cancelado" && s.descontados.includes(p.id)) {
      moverStock(s, p, 1);
      s.descontados = s.descontados.filter((x) => x !== p.id);
    }
    p.estado = nuevo;
    if (nuevo === "entregado") p.entregadoEn = Date.now();
    emitir({ tipo: "pedido_cambio", pedido: clonar(p) });
  },
  async marcarPagado(id, pagado) {
    const p = leer().pedidos.find((x) => x.id === id);
    if (!p) return;
    p.pagado = pagado;
    emitir({ tipo: "pedido_cambio", pedido: clonar(p) });
  },
  async registrarVentaCaja(np) {
    const s = leer();
    for (const it of np.items) {
      const prod = s.productos.find((x) => x.id === it.productoId);
      if (prod && (!prod.disponible || prod.stock < it.qty))
        throw new Error(`Stock insuficiente de ${prod.nombre} (quedan ${prod.stock})`);
    }
    const p = nuevoPedido(s, { ...np, canal: "caja", estado: "cocina" });
    moverStock(s, p, -1);
    s.descontados.push(p.id);
    s.pedidos.push(p);
    emitir({ tipo: "pedido_nuevo", pedido: clonar(p) });
    return p.codigo;
  },
  async crearPedidoManual(np) {
    const s = leer();
    const p = nuevoPedido(s, { ...np, estado: "nuevo" });
    s.pedidos.push(p);
    emitir({ tipo: "pedido_nuevo", pedido: clonar(p) });
    return p.codigo;
  },
  async crearEncuesta(pedidoId) {
    const token = btoa(pedidoId + ":" + Date.now()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
    return "https://alamibro.pe/encuesta?t=" + token;
  },

  async productos() {
    return clonar(leer().productos);
  },
  async actualizarProducto(id, patch) {
    const p = leer().productos.find((x) => x.id === id);
    if (!p) return;
    if (patch.disponible !== undefined) p.disponible = patch.disponible;
    patch.precios?.forEach(({ id: zid, precio }) => {
      const z = p.presentaciones.find((x) => x.id === zid);
      if (z) z.precio = precio;
    });
    emitir({ tipo: "catalogo" });
  },
  async ajustarStock(id, delta) {
    const p = leer().productos.find((x) => x.id === id);
    if (!p) return 0;
    p.stock = Math.max(0, p.stock + delta);
    emitir({ tipo: "catalogo" });
    return p.stock;
  },
  async subirFoto(id, archivo) {
    const url = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(new Error("No se pudo leer la imagen"));
      fr.readAsDataURL(archivo);
    });
    const p = leer().productos.find((x) => x.id === id);
    if (p) p.img = url;
    emitir({ tipo: "catalogo" });
    return url;
  },
  async salsas() {
    return clonar(leer().salsas);
  },
  async setSalsa(id, disponible) {
    const x = leer().salsas.find((s) => s.id === id);
    if (x) x.disponible = disponible;
    emitir({ tipo: "catalogo" });
  },
  async agregados() {
    return clonar(leer().agregados);
  },
  async setAgregado(id, disponible) {
    const x = leer().agregados.find((s) => s.id === id);
    if (x) x.disponible = disponible;
    emitir({ tipo: "catalogo" });
  },

  async promos() {
    return clonar(leer().promos);
  },
  async crearPromo(p) {
    leer().promos.push({ ...p, id: "p" + Date.now(), codigo: p.codigo ? p.codigo.toUpperCase() : null });
    emitir({ tipo: "catalogo" });
  },
  async setPromoActiva(id, activa) {
    const x = leer().promos.find((p) => p.id === id);
    if (x) x.activa = activa;
    emitir({ tipo: "catalogo" });
  },

  /** Igual que la vista clientes_resumen: se calcula a partir de los pedidos con teléfono. */
  async clientes() {
    const s = leer();
    const mapa = new Map<string, Cliente>();
    const salsasPorCliente = new Map<string, Map<string, number>>();
    for (const p of s.pedidos) {
      if (!p.telefono || p.estado === "cancelado" || p.estado === "sin_respuesta") continue;
      const c =
        mapa.get(p.telefono) ??
        ({ id: p.telefono, nombre: p.cliente, telefono: p.telefono, origen: s.origenes[p.telefono] ?? (p.canal === "web" ? "Web" : "Caja"), pedidos: 0, gastado: 0, ultimoPedido: null, salsaFavorita: "—" } as Cliente);
      c.pedidos++;
      c.gastado += p.total;
      if (!c.ultimoPedido || p.creadoEn > c.ultimoPedido) {
        c.ultimoPedido = p.creadoEn;
        c.nombre = p.cliente;
      }
      mapa.set(p.telefono, c);
      const m = salsasPorCliente.get(p.telefono) ?? new Map<string, number>();
      p.items.forEach((it) => (it.salsas ?? []).forEach((x) => m.set(x, (m.get(x) ?? 0) + it.qty)));
      salsasPorCliente.set(p.telefono, m);
    }
    for (const c of mapa.values()) {
      const fav = [...(salsasPorCliente.get(c.telefono)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0];
      if (fav) c.salsaFavorita = s.salsas.find((x) => x.id === fav[0])?.nombre ?? fav[0];
    }
    return [...mapa.values()].sort((a, b) => b.gastado - a.gastado);
  },
  async resenas() {
    return clonar(leer().resenas).sort((a, b) => b.fecha - a.fecha);
  },

  async ajustes() {
    return clonar(leer().ajustes);
  },
  async guardarAjustes(patch) {
    const s = leer();
    s.ajustes = { ...s.ajustes, ...patch };
    emitir({ tipo: "ajustes" });
  },
  async zonas() {
    return clonar(leer().zonas);
  },
  async guardarZona(id, costo) {
    const z = leer().zonas.find((x) => x.id === id);
    if (z) z.costo = costo;
    emitir({ tipo: "ajustes" });
  },

  suscribir(cb) {
    oyentes.add(cb);
    return () => oyentes.delete(cb);
  },
};

/** Borra los datos de ejemplo (se regeneran en la próxima lectura). */
export function reiniciarDemo() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
  estado = null;
}
