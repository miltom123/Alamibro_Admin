import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Cargando, Interruptor, Miniatura, Segmentado } from "@/components/ui";
import { useActualizarProducto, useAgregados, useAjustarStock, useProductos, useSalsas, useSetAgregado, useSetSalsa, useSubirFoto } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { sinClave } from "@/lib/formato";
import { etiquetaCategoria } from "@/lib/catalogo";
import { STOCK_BAJO } from "@/lib/config";
import { money } from "@/lib/formato";
import type { ProductoAdmin } from "@/lib/tipos";

type Tab = "prod" | "salsas" | "extras";

export default function Carta() {
  const [params, setParams] = useSearchParams();
  const tab = (["prod", "salsas", "extras"].includes(params.get("tab") ?? "") ? params.get("tab") : "prod") as Tab;
  const { data: productos, isLoading } = useProductos();
  const { data: salsas = [] } = useSalsas();
  const { data: agregados = [] } = useAgregados();
  const setSalsa = useSetSalsa();
  const setAgregado = useSetAgregado();

  if (isLoading || !productos) return <Cargando />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado<Tab>
          role="tablist"
          label="Secciones de la carta"
          opciones={[
            { id: "prod", label: "Productos" },
            { id: "salsas", label: "Salsas" },
            { id: "extras", label: "Agregados" },
          ]}
          valor={tab}
          onChange={(t) => setParams(t === "prod" ? {} : { tab: t }, { replace: true })}
        />
        <p className="m-0 text-sm text-tinta-2">
          Lo que apagues aquí se muestra como <b>agotado</b> en la landing.
        </p>
      </div>

      {tab === "prod" ? (
        <div className="overflow-x-auto rounded-[20px] border border-borde bg-white">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="text-left text-xs tracking-[1px] text-tinta-3 uppercase">
                <th className="px-[18px] py-3.5">Producto</th>
                <th className="px-2.5 py-3.5">Precios (S/)</th>
                <th className="px-2.5 py-3.5">Stock</th>
                <th className="px-2.5 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <FilaProducto key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {(tab === "salsas" ? salsas.map((s) => ({ ...s, precio: null as number | null })) : agregados).map((s) => (
            <div key={s.id} className="adm-card flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5" style={{ borderColor: s.disponible ? "#EADFCF" : "#E6D9C6" }}>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold" style={{ textDecoration: s.disponible ? "none" : "line-through" }}>
                  {s.nombre}
                </div>
                <div className="text-[13px] text-tinta-3">
                  {s.precio === null ? (s.disponible ? "Visible en la landing" : "Agotada · oculta") : "+ " + money(s.precio) + (s.disponible ? "" : " · agotado")}
                </div>
              </div>
              <Interruptor
                on={s.disponible}
                label={"Disponible " + s.nombre}
                onChange={() => (tab === "salsas" ? setSalsa : setAgregado).mutate({ id: s.id, disponible: !s.disponible })}
                className="grid h-11 w-[52px] place-items-center"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilaProducto({ p }: { p: ProductoAdmin }) {
  const actualizar = useActualizarProducto();
  const stock = useAjustarStock();
  const foto = useSubirFoto();
  const flash = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [precios, setPrecios] = useState<Record<string, string>>({});

  const guardarPrecio = (zid: string) => {
    const v = precios[zid];
    if (v === undefined) return;
    const n = parseFloat(v.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      flash("Precio inválido");
      setPrecios((x) => sinClave(x, zid));
      return;
    }
    actualizar.mutate({ id: p.id, precios: [{ id: zid, precio: Math.round(n * 100) / 100 }] }, { onSettled: () => setPrecios((x) => sinClave(x, zid)) });
  };

  return (
    <tr className="adm-row border-t border-borde-3">
      <td className="px-[18px] py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            title="Cambiar foto"
            aria-label={"Cambiar foto de " + p.nombre}
            className="adm-btn group relative h-12 w-12 flex-none overflow-hidden rounded-xl border-0 p-0"
          >
            <Miniatura img={p.img} tile={p.tile} nombre={p.nombre} className="h-full w-full" texto="text-base" />
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">Foto</span>
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 3_000_000) flash("La foto debe pesar menos de 3 MB");
                else foto.mutate({ id: p.id, archivo: f });
              }
              e.target.value = "";
            }}
          />
          <div>
            <div className="text-[15px] font-extrabold">{p.nombre}</div>
            <div className="text-xs text-tinta-3">{etiquetaCategoria(p.categoria)}</div>
          </div>
        </div>
      </td>
      <td className="px-2.5 py-3">
        <div className="flex flex-wrap gap-2">
          {p.presentaciones.map((z) => (
            <label key={z.id} className="flex flex-col gap-[3px] text-[11px] font-bold text-tinta-3">
              {z.label}
              <input
                className="adm-input tabular min-h-[38px] w-[78px] rounded-[9px] border border-borde-2 px-2 text-sm font-bold text-tinta"
                inputMode="decimal"
                aria-label={"Precio " + p.nombre + " " + z.label}
                value={precios[z.id] ?? String(z.precio)}
                onChange={(e) => setPrecios((s) => ({ ...s, [z.id]: e.target.value }))}
                onBlur={() => guardarPrecio(z.id)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            </label>
          ))}
        </div>
      </td>
      <td className="px-2.5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-[10px] border border-borde-2">
            <button type="button" onClick={() => stock.mutate({ id: p.id, delta: -1 })} aria-label={"Restar stock de " + p.nombre} className="adm-btn h-9 w-[34px] border-0 bg-transparent text-[17px] font-extrabold text-tinta">
              −
            </button>
            <span className="tabular min-w-8 text-center font-extrabold" aria-label={"Stock de " + p.nombre}>
              {p.stock}
            </span>
            <button type="button" onClick={() => stock.mutate({ id: p.id, delta: 5 })} aria-label={"Sumar 5 al stock de " + p.nombre} title="Sumar 5" className="adm-btn h-9 w-[34px] border-0 bg-transparent text-[17px] font-extrabold text-tinta">
              +
            </button>
          </div>
          {p.disponible && p.stock <= STOCK_BAJO ? <span className="rounded-full bg-[#FDE7E7] px-2 py-[3px] text-xs font-extrabold text-rojo-sombra">Stock bajo</span> : null}
        </div>
      </td>
      <td className="px-2.5 py-3">
        <Interruptor
          on={p.disponible}
          label={"Disponible " + p.nombre}
          onChange={() => actualizar.mutate({ id: p.id, disponible: !p.disponible })}
          className="min-h-10 text-[13px] font-bold"
          style={{ color: p.disponible ? "#1F7A4A" : "#5E4E42" }}
        >
          {p.disponible ? "Disponible" : "Agotado"}
        </Interruptor>
      </td>
    </tr>
  );
}
