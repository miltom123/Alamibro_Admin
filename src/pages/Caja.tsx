import { useState } from "react";
import { Cargando, Interruptor, Miniatura, Opciones, sel } from "@/components/ui";
import { usePedidos, useProductos, useSalsas, useVentaCaja } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { CATEGORIAS, maxSalsas } from "@/lib/catalogo";
import { STOCK_BAJO } from "@/lib/config";
import { money } from "@/lib/formato";
import { alternarSalsa } from "@/lib/caja";
import type { MetodoPago, Modalidad } from "@/lib/tipos";

interface Linea {
  key: number;
  pid: string;
  zid: string;
  qty: number;
  salsas: string[];
}

const VACIO = { lineas: [] as Linea[], nombre: "", telefono: "", direccion: "", efectivo: "", pagado: false };

export default function Caja() {
  const { data: productos, isLoading } = useProductos();
  const { data: salsas = [] } = useSalsas();
  const { data: pedidos = [] } = usePedidos();
  const venta = useVentaCaja();
  const flash = useToast();
  const [cat, setCat] = useState("todo");
  const [t, setT] = useState(VACIO);
  const [modo, setModo] = useState<Modalidad>("salon");
  const [pago, setPago] = useState<MetodoPago>("Efectivo");

  if (isLoading || !productos) return <Cargando />;

  const cats = [{ id: "todo", label: "Todo" }, ...CATEGORIAS.filter((c) => productos.some((p) => p.categoria === c.id))];
  const lista = productos.filter((p) => cat === "todo" || p.categoria === cat);
  const prod = (id: string) => productos.find((p) => p.id === id)!;
  const precio = (l: Linea) => prod(l.pid).presentaciones.find((z) => z.id === l.zid)?.precio ?? 0;
  const total = t.lineas.reduce((a, l) => a + precio(l) * l.qty, 0);
  const recibido = parseFloat(t.efectivo.replace(",", ".")) || 0;
  const usadas = (pid: string) => t.lineas.filter((l) => l.pid === pid).reduce((a, l) => a + l.qty, 0);
  const siguiente = pedidos.reduce((m, o) => Math.max(m, parseInt(o.codigo.replace(/\D/g, ""), 10) || 0), 0) + 1;

  const patch = (x: Partial<typeof VACIO>) => setT((s) => ({ ...s, ...x }));
  const linea = (key: number, x: Partial<Linea>) => patch({ lineas: t.lineas.map((l) => (l.key === key ? { ...l, ...x } : l)).filter((l) => l.qty > 0) });

  function agregar(pid: string, zid: string) {
    const p = prod(pid);
    if (usadas(pid) + 1 > p.stock) return flash("Solo quedan " + p.stock + " de " + p.nombre);
    const i = t.lineas.findIndex((l) => l.pid === pid && l.zid === zid && !l.salsas.length);
    if (i >= 0) patch({ lineas: t.lineas.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l)) });
    else patch({ lineas: [...t.lineas, { key: Date.now() + Math.random(), pid, zid, qty: 1, salsas: [] }] });
  }

  function registrar() {
    if (!t.lineas.length) return flash("Agrega al menos un producto");
    const sinSalsa = t.lineas.find((l) => maxSalsas(prod(l.pid), l.zid) > 0 && l.salsas.length === 0);
    if (sinSalsa) return flash("Elige las salsas de " + prod(sinSalsa.pid).nombre);
    if (modo === "delivery" && t.direccion.trim().length < 5) return flash("Agrega la dirección de entrega");
    const nombreSalsa = (id: string) => salsas.find((s) => s.id === id)?.nombre ?? id;
    const items = t.lineas.map((l) => {
      const p = prod(l.pid);
      const z = p.presentaciones.find((x) => x.id === l.zid)!;
      const det: string[] = [];
      if (p.presentaciones.length > 1) det.push(z.label);
      if (l.salsas.length) det.push("Salsas: " + l.salsas.map(nombreSalsa).join(", "));
      return { qty: l.qty, nombre: p.nombre, detalle: det.join(" · "), total: z.precio * l.qty, productoId: p.id, presentacionId: z.id, salsas: l.salsas };
    });
    venta.mutate(
      {
        cliente: t.nombre.trim() || (modo === "salon" ? "Salón" : "Cliente en caja"),
        telefono: t.telefono,
        canal: "caja",
        modalidad: modo,
        direccion: modo === "delivery" ? t.direccion.trim() : "",
        pago,
        pagado: t.pagado,
        estado: "cocina",
        nota: "",
        items,
      },
      { onSuccess: () => setT(VACIO) }
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <section className="flex min-w-0 flex-[3_1_520px] flex-col gap-3.5">
        <Opciones opciones={cats} valor={cat} onChange={setCat} label="Categorías" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
          {lista.map((p) => {
            const agotado = !p.disponible || p.stock <= 0;
            return (
              <div key={p.id} className="adm-card flex flex-col overflow-hidden rounded-[18px] border border-borde bg-white" style={{ opacity: agotado ? 0.5 : 1 }}>
                <div className="relative h-[110px]">
                  <Miniatura img={p.img} tile={p.tile} nombre={p.nombre} className="h-full w-full" />
                  <span
                    className="absolute top-2 right-2 rounded-full px-[9px] py-[3px] text-xs font-extrabold"
                    style={{
                      background: agotado ? "#16100D" : p.stock <= STOCK_BAJO ? "#FFB21A" : "rgba(255,255,255,.92)",
                      color: agotado ? "#FFF4E2" : "#16100D",
                    }}
                  >
                    {agotado ? "Agotado" : p.stock <= STOCK_BAJO ? "Quedan " + p.stock : p.stock + " disp."}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <div className="text-base leading-[1.2] font-extrabold">{p.nombre}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.presentaciones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        disabled={agotado}
                        onClick={() => agregar(p.id, z.id)}
                        aria-label={"Agregar " + p.nombre + " " + z.label}
                        className="adm-btn flex min-h-12 flex-[1_1_60px] flex-col items-center justify-center rounded-xl border border-[#F1C9C9] bg-[#FFF5F5] px-2 py-1 text-[13px] leading-[1.15] font-bold text-tinta"
                      >
                        <span>{z.label}</span>
                        <span className="tabular font-black text-rojo-texto">{money(z.precio)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside aria-label="Ticket" className="flex min-w-0 flex-[2_1_360px] flex-col overflow-hidden rounded-[22px] border border-borde bg-white">
        <div className="flex items-center justify-between bg-fondo px-5 py-[18px] text-crema">
          <div>
            <div className="font-titulo text-[26px] leading-none">Ticket</div>
            <div className="text-[13px] text-texto-2-osc">Siguiente: AMB-{String(siguiente).padStart(5, "0")}</div>
          </div>
          <button type="button" onClick={() => patch({ lineas: [], efectivo: "" })} className="adm-btn min-h-[38px] rounded-[10px] border border-oscuro-borde-2 bg-transparent px-3 text-[13px] font-bold text-crema-2">
            Limpiar
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          {t.lineas.length === 0 ? <p className="m-0 py-[22px] text-center text-tinta-3">Toca un tamaño para agregar productos.</p> : null}
          {t.lineas.map((l) => {
            const p = prod(l.pid);
            const z = p.presentaciones.find((x) => x.id === l.zid)!;
            const max = maxSalsas(p, l.zid);
            return (
              <div key={l.key} className="adm-up flex flex-col gap-2 rounded-[14px] border border-papel-3 bg-papel-2 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-extrabold">{p.nombre}</div>
                    <div className="text-[13px] text-tinta-2">
                      {z.label} · {money(z.precio)}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-[10px] border border-borde-2 bg-white">
                    <button type="button" onClick={() => linea(l.key, { qty: l.qty - 1 })} aria-label="Quitar uno" className="adm-btn h-9 w-9 border-0 bg-transparent text-lg font-extrabold text-tinta">
                      −
                    </button>
                    <span className="min-w-[22px] text-center font-extrabold">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => (usadas(l.pid) + 1 > p.stock ? flash("Solo quedan " + p.stock + " de " + p.nombre) : linea(l.key, { qty: l.qty + 1 }))}
                      aria-label="Agregar uno"
                      className="adm-btn h-9 w-9 border-0 bg-transparent text-lg font-extrabold text-tinta"
                    >
                      +
                    </button>
                  </div>
                  <span className="tabular w-20 text-right font-black">{money(z.precio * l.qty)}</span>
                </div>
                {max > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold" style={{ color: l.salsas.length ? "#1F7A4A" : "#B5121B" }}>
                      Salsas {l.salsas.length} de {max}
                    </span>
                    <div className="flex flex-wrap gap-[5px]" role="group" aria-label={"Salsas de " + p.nombre}>
                      {salsas.map((s) => {
                        const on = l.salsas.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={!s.disponible}
                            aria-pressed={on}
                            onClick={() => linea(l.key, { salsas: alternarSalsa(l.salsas, s.id, max) })}
                            className="adm-btn min-h-8 rounded-full border border-solid px-2.5 text-xs font-semibold"
                            style={{ ...sel(on), boxShadow: "none", color: on ? "#FFB21A" : "#3A2A1E", textDecoration: s.disponible ? "none" : "line-through" }}
                          >
                            {s.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-2.5 pt-1.5">
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Cliente / mesa
              <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-medium text-tinta" value={t.nombre} onChange={(e) => patch({ nombre: e.target.value })} placeholder="Ej. Mesa 4" />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Teléfono
              <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-medium text-tinta" inputMode="tel" value={t.telefono} onChange={(e) => patch({ telefono: e.target.value })} placeholder="Opcional" />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Modalidad</span>
            <Opciones<Modalidad>
              label="Modalidad"
              opciones={[
                { id: "salon", label: "Salón" },
                { id: "recojo", label: "Recojo" },
                { id: "delivery", label: "Delivery" },
              ]}
              valor={modo}
              onChange={setModo}
              className="!grid grid-cols-3 !gap-1.5"
              btnClass="min-h-[42px] rounded-[10px] text-sm"
            />
          </div>
          {modo === "delivery" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Dirección
              <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-medium text-tinta" value={t.direccion} onChange={(e) => patch({ direccion: e.target.value })} placeholder="Calle, número y referencia" />
            </label>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Pago</span>
            <Opciones<MetodoPago>
              label="Pago"
              opciones={(["Efectivo", "Yape", "Plin", "Tarjeta"] as MetodoPago[]).map((m) => ({ id: m, label: m }))}
              valor={pago}
              onChange={setPago}
              className="!grid grid-cols-4 !gap-1.5"
              btnClass="min-h-[42px] rounded-[10px] text-[13px]"
            />
          </div>
          {pago === "Efectivo" ? (
            <div className="flex items-end gap-2.5">
              <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-bold">
                Recibido (S/)
                <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-base font-semibold text-tinta" inputMode="decimal" value={t.efectivo} onChange={(e) => patch({ efectivo: e.target.value })} placeholder="0.00" />
              </label>
              <div className="flex min-h-11 flex-1 flex-col justify-center rounded-[10px] bg-verde-claro px-3 py-1.5" aria-live="polite">
                <span className="text-xs font-bold text-verde-osc">Vuelto</span>
                <span className="tabular text-[17px] font-black text-[#14532D]">{recibido >= total && total > 0 ? money(recibido - total) : "—"}</span>
              </div>
            </div>
          ) : null}
          <Interruptor on={t.pagado} onChange={() => patch({ pagado: !t.pagado })} className="min-h-11 px-1 text-left text-sm font-bold text-tinta">
            Pago recibido y confirmado
          </Interruptor>
        </div>
        <div className="mt-auto flex flex-col gap-3 border-t border-papel-3 px-5 pt-4 pb-5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-tinta-2">Total</span>
            <span className="tabular text-[32px] font-black text-rojo-texto">{money(total)}</span>
          </div>
          <button
            type="button"
            onClick={registrar}
            disabled={venta.isPending}
            className="adm-btn adm-shine min-h-14 rounded-[14px] border-0 text-base font-extrabold text-white"
            style={{ background: t.lineas.length ? "#E11D1F" : "#B9A794", boxShadow: "0 6px 0 " + (t.lineas.length ? "#8E0F10" : "#9C8A77") }}
          >
            {venta.isPending ? "Registrando…" : "Registrar y enviar a cocina"}
          </button>
        </div>
      </aside>
    </div>
  );
}
