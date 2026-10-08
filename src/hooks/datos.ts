/** Hooks de datos (TanStack Query) sobre la capa `api` + tiempo real. */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DIA_MS, inicioDia } from "@/lib/formato";
import type { Ajustes, EstadoPedido, NuevaPromo, NuevoPedido } from "@/lib/tipos";
import { useToast } from "./toast";

/** Ventana de pedidos que carga el panel: 8 semanas (alcanza para "Mes" y su comparación). */
const desdeVentana = () => inicioDia(Date.now()) - 56 * DIA_MS;

export const claves = {
  pedidos: ["pedidos"] as const,
  productos: ["productos"] as const,
  salsas: ["salsas"] as const,
  agregados: ["agregados"] as const,
  promos: ["promos"] as const,
  clientes: ["clientes"] as const,
  resenas: ["resenas"] as const,
  ajustes: ["ajustes"] as const,
  zonas: ["zonas"] as const,
};

export const usePedidos = () => useQuery({ queryKey: claves.pedidos, queryFn: () => api.pedidos(desdeVentana()), refetchInterval: 60_000 });
export const useProductos = () => useQuery({ queryKey: claves.productos, queryFn: api.productos });
export const useSalsas = () => useQuery({ queryKey: claves.salsas, queryFn: api.salsas });
export const useAgregados = () => useQuery({ queryKey: claves.agregados, queryFn: api.agregados });
export const usePromos = () => useQuery({ queryKey: claves.promos, queryFn: api.promos });
export const useClientes = () => useQuery({ queryKey: claves.clientes, queryFn: api.clientes });
export const useResenas = () => useQuery({ queryKey: claves.resenas, queryFn: api.resenas });
export const useAjustes = () => useQuery({ queryKey: claves.ajustes, queryFn: api.ajustes });
export const useZonas = () => useQuery({ queryKey: claves.zonas, queryFn: api.zonas });

/** "Ahora" que se actualiza cada 30 s (cronómetros de pedidos). */
export function useAhora(cada = 30_000) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setT(Date.now()), cada);
    return () => clearInterval(iv);
  }, [cada]);
  return t;
}

/** Mutación genérica: muestra el error en un toast e invalida lo indicado. */
function useAccion<A, R>(fn: (a: A) => Promise<R>, invalidar: readonly (readonly string[])[], ok?: (r: R, a: A) => string | void) {
  const qc = useQueryClient();
  const flash = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, a) => {
      const m = ok?.(r, a);
      if (m) flash(m);
    },
    onError: (e) => flash(e instanceof Error ? e.message : "Algo salió mal"),
    onSettled: () => invalidar.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}

export const useCambiarEstado = () =>
  useAccion((a: { id: string; estado: EstadoPedido; codigo: string; etiqueta: string }) => api.cambiarEstado(a.id, a.estado), [claves.pedidos, claves.productos], (_, a) => a.codigo + " → " + a.etiqueta);
export const useMarcarPagado = () => useAccion((a: { id: string; pagado: boolean }) => api.marcarPagado(a.id, a.pagado), [claves.pedidos]);
export const useVentaCaja = () => useAccion((p: NuevoPedido) => api.registrarVentaCaja(p), [claves.pedidos, claves.productos, claves.clientes], (codigo) => codigo + " enviado a cocina");
export const usePedidoManual = () => useAccion((p: NuevoPedido) => api.crearPedidoManual(p), [claves.pedidos, claves.clientes], (codigo) => codigo + " creado desde WhatsApp");
export const useActualizarProducto = () =>
  useAccion((a: { id: string; disponible?: boolean; precios?: { id: string; precio: number }[] }) => api.actualizarProducto(a.id, a), [claves.productos]);
export const useAjustarStock = () => useAccion((a: { id: string; delta: number }) => api.ajustarStock(a.id, a.delta), [claves.productos]);
export const useSubirFoto = () => useAccion((a: { id: string; archivo: File }) => api.subirFoto(a.id, a.archivo), [claves.productos], () => "Foto actualizada");
export const useSetSalsa = () => useAccion((a: { id: string; disponible: boolean }) => api.setSalsa(a.id, a.disponible), [claves.salsas]);
export const useSetAgregado = () => useAccion((a: { id: string; disponible: boolean }) => api.setAgregado(a.id, a.disponible), [claves.agregados]);
export const useCrearPromo = () => useAccion((p: NuevaPromo) => api.crearPromo(p), [claves.promos], (_, p) => "Promo publicada: " + p.nombre);
export const useSetPromo = () => useAccion((a: { id: string; activa: boolean }) => api.setPromoActiva(a.id, a.activa), [claves.promos]);
export const useGuardarAjustes = () => useAccion((p: Partial<Ajustes>) => api.guardarAjustes(p), [claves.ajustes]);
export const useGuardarZona = () => useAccion((a: { id: string; costo: number }) => api.guardarZona(a.id, a.costo), [claves.zonas]);

/** Sonido corto al llegar un pedido de la web (sin archivos de audio). */
export function sonarPedidoNuevo() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.18);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch {
    /* el navegador bloqueó el audio */
  }
}

/** Escucha cambios en vivo: refresca datos y avisa con sonido + toast cuando entra un pedido web. */
export function useTiempoReal() {
  const qc = useQueryClient();
  const flash = useToast();
  useEffect(
    () =>
      api.suscribir((e) => {
        if (e.tipo === "pedido_nuevo" || e.tipo === "pedido_cambio") {
          qc.invalidateQueries({ queryKey: claves.pedidos });
          qc.invalidateQueries({ queryKey: claves.productos });
          if (e.tipo === "pedido_nuevo" && e.pedido?.canal === "web" && e.pedido.estado === "nuevo") {
            sonarPedidoNuevo();
            flash("Nuevo pedido " + e.pedido.codigo + " de la web");
          }
        }
        if (e.tipo === "catalogo") ["productos", "salsas", "agregados", "promos"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        if (e.tipo === "ajustes") {
          qc.invalidateQueries({ queryKey: claves.ajustes });
          qc.invalidateQueries({ queryKey: claves.zonas });
        }
      }),
    [qc, flash]
  );
}

/** Mapa id de salsa → nombre (para reportes). */
export function useNombreSalsa() {
  const { data } = useSalsas();
  return useMemo(() => {
    const m = new Map((data ?? []).map((s) => [s.id, s.nombre]));
    return (id: string) => m.get(id) ?? id;
  }, [data]);
}
