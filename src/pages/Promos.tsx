import { useState } from "react";
import { Cargando, Interruptor, Opciones } from "@/components/ui";
import { useAhora, useCrearPromo, usePromos, useSetPromo } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { ORDEN_SEMANA, nombreDia, textoBeneficio, textoDias } from "@/lib/reglas";
import type { TipoPromo } from "@/lib/tipos";

const CORTO: Record<number, string> = { 1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S", 0: "D" };
const ALCANCES = ["Toda la carta", "Alitas", "Combos", "Bebidas"];
const INICIAL = { nombre: "", codigo: "", tipo: "porc" as TipoPromo, valor: "15", desde: "17:00", hasta: "23:30", dias: [2, 3], alcance: "Toda la carta" };

export default function Promos() {
  const { data: promos, isLoading } = usePromos();
  const crear = useCrearPromo();
  const activar = useSetPromo();
  const flash = useToast();
  const ahora = useAhora();
  const [f, setF] = useState(INICIAL);
  const [aviso, setAviso] = useState("");

  if (isLoading || !promos) return <Cargando />;
  const hoy = new Date(ahora).getDay();
  const set = (x: Partial<typeof INICIAL>) => {
    setF((s) => ({ ...s, ...x }));
    setAviso("");
  };
  const valorNum = parseFloat(f.valor.replace(",", "."));

  function publicar() {
    if (!f.nombre.trim()) return setAviso("Ponle un nombre a la promo"), flash("Ponle un nombre a la promo");
    if (!f.dias.length) return setAviso("Elige al menos un día"), flash("Elige al menos un día");
    if (f.tipo !== "3x2" && (!Number.isFinite(valorNum) || valorNum <= 0)) return setAviso("Escribe el valor del beneficio"), flash("Escribe el valor del beneficio");
    if (f.tipo === "porc" && valorNum > 90) return setAviso("El descuento no puede pasar del 90%");
    if (f.desde >= f.hasta) return setAviso("La hora de inicio debe ser antes que la de fin");
    const codigo = f.codigo.trim().toUpperCase().replace(/\s+/g, "");
    if (codigo && promos!.some((p) => p.codigo === codigo)) return setAviso("Ya existe un cupón con ese código");
    crear.mutate(
      { nombre: f.nombre.trim(), tipo: f.tipo, valor: f.tipo === "3x2" ? null : valorNum, dias: f.dias, desde: f.desde, hasta: f.hasta, alcance: f.alcance, codigo: codigo || null, activa: true },
      { onSuccess: () => setF((s) => ({ ...s, nombre: "", codigo: "" })) }
    );
  }

  const vista = { tipo: f.tipo, valor: f.tipo === "3x2" ? null : valorNum || 0 };

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="flex flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-5">
        <div>
          <h3 className="m-0 text-lg font-extrabold">Semana de promos</h3>
          <p className="mt-[3px] mb-0 text-sm text-tinta-2">Lo que está activo cada día. Hoy está resaltado.</p>
        </div>
        <div className="adm-scroll grid grid-cols-[repeat(7,minmax(140px,1fr))] gap-2.5 overflow-x-auto pb-1">
          {ORDEN_SEMANA.map((d) => {
            const lista = promos.filter((p) => p.dias.includes(d));
            const esHoy = d === hoy;
            return (
              <div key={d} className="flex min-h-[150px] flex-col gap-2 rounded-2xl border-2 p-2.5" style={{ background: esHoy ? "#FFF4E2" : "#FBF6EE", borderColor: esHoy ? "#E11D1F" : "#EFE4D3" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black tracking-[1px]" style={{ color: esHoy ? "#B5121B" : "#3A2A1E" }}>
                    {nombreDia(d).toUpperCase()}
                  </span>
                  {esHoy ? <span className="rounded-full bg-rojo px-2 py-0.5 text-[11px] font-extrabold text-white">HOY</span> : null}
                </div>
                {lista.map((p) => (
                  <div key={p.id} className="flex flex-col gap-[3px] rounded-[10px] border border-borde bg-white px-2.5 py-2">
                    <span className="text-[11px] font-bold text-tinta-3">
                      {p.desde} – {p.hasta}
                    </span>
                    <span className="text-[13px] leading-[1.2] font-extrabold">{p.nombre}</span>
                    <span className="self-start rounded-full px-[7px] py-0.5 text-[11px] font-extrabold" style={{ background: p.activa ? "#EAF7EF" : "#F3E9DB", color: p.activa ? "#1F7A4A" : "#5E4E42" }}>
                      {p.activa ? "Activa" : "Pausada"}
                    </span>
                  </div>
                ))}
                {lista.length === 0 ? <span className="m-auto text-xs text-[#8F7C6A] italic">Sin promos</span> : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-[18px]">
        <section className="flex min-w-0 flex-[3_1_460px] flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-5">
          <h3 className="m-0 text-lg font-extrabold">Crear promoción o cupón</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Nombre visible
              <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-medium text-tinta" value={f.nombre} maxLength={60} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej. Martes de combos" />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Código de cupón (opcional)
              <input
                className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-bold tracking-[1px] text-tinta uppercase"
                value={f.codigo}
                maxLength={20}
                onChange={(e) => set({ codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                placeholder="Ej. BROMARTES"
              />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Tipo de beneficio</span>
            <Opciones<TipoPromo>
              label="Tipo de beneficio"
              opciones={[
                { id: "porc", label: "% descuento" },
                { id: "monto", label: "Monto fijo" },
                { id: "3x2", label: "3x2" },
                { id: "precio", label: "Precio especial" },
              ]}
              valor={f.tipo}
              onChange={(tipo) => set({ tipo })}
              className="!grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] !gap-1.5"
              btnClass="min-h-[42px] rounded-[10px] text-[13px]"
            />
            {f.codigo && (f.tipo === "3x2" || f.tipo === "precio") ? (
              <span className="text-xs font-semibold text-[#7A4A00]">Los cupones solo funcionan con % descuento o monto fijo; este código no se podrá canjear en la web.</span>
            ) : null}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            {f.tipo !== "3x2" ? (
              <label className="flex flex-col gap-1.5 text-[13px] font-bold">
                {f.tipo === "porc" ? "Descuento (%)" : f.tipo === "monto" ? "Descuento (S/)" : "Precio especial (S/)"}
                <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-semibold text-tinta" inputMode="decimal" value={f.valor} onChange={(e) => set({ valor: e.target.value })} />
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Desde
              <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-semibold text-tinta" type="time" value={f.desde} onChange={(e) => set({ desde: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Hasta
              <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-semibold text-tinta" type="time" value={f.hasta} onChange={(e) => set({ hasta: e.target.value })} />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Días</span>
            <Opciones<number>
              label="Días"
              opciones={ORDEN_SEMANA.map((d) => ({ id: d, label: <span aria-label={nombreDia(d)}>{CORTO[d]}</span> }))}
              valor={f.dias}
              onChange={(d) => set({ dias: f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d] })}
              className="!gap-1.5"
              btnClass="h-11 w-12 rounded-xl text-sm !font-extrabold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Aplica a</span>
            <Opciones label="Aplica a" opciones={ALCANCES.map((a) => ({ id: a, label: a }))} valor={f.alcance} onChange={(alcance) => set({ alcance })} className="!gap-1.5" btnClass="min-h-10 rounded-full px-3.5 text-[13px]" />
          </div>
          {aviso ? (
            <div role="alert" className="rounded-xl bg-[#FDE7E7] px-3.5 py-2.5 text-sm font-bold text-rojo-sombra">
              {aviso}
            </div>
          ) : null}
          <button type="button" onClick={publicar} disabled={crear.isPending} className="adm-btn adm-shine min-h-[50px] self-start rounded-[14px] border-0 bg-rojo px-[22px] text-[15px] font-extrabold text-white shadow-[0_6px_0_#8E0F10]">
            Crear y publicar
          </button>
        </section>

        <section className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5">
          <div className="flex flex-col gap-3 rounded-[22px] bg-fondo p-5 text-crema">
            <span className="text-xs font-extrabold tracking-[1.5px] text-ambar-claro">VISTA PREVIA EN LA LANDING</span>
            <div className="flex flex-col gap-1.5 rounded-[18px] bg-ambar p-[18px] text-fondo">
              <span className="font-titulo text-[44px] leading-[.95] text-rojo-texto">{textoBeneficio(vista)}</span>
              <span className="text-lg font-black">
                {f.nombre.trim() || "Nombre de tu promo"} · {f.alcance}
              </span>
              <span className="text-sm font-semibold text-[#3A2A1E]">
                {f.dias.length ? textoDias(f.dias) : "Elige los días"} · {f.desde} a {f.hasta}
              </span>
              {f.codigo.trim() ? <span className="mt-1 self-start rounded-[10px] border-2 border-dashed border-fondo px-3 py-1.5 font-black tracking-[2px]">{f.codigo.trim().toUpperCase()}</span> : null}
            </div>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-borde bg-white">
            <div className="border-b border-borde-3 px-[18px] py-4 text-base font-extrabold">Promos y cupones</div>
            {promos.map((p) => (
              <div key={p.id} className="adm-row flex items-center gap-3 border-b border-borde-3 px-[18px] py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-extrabold">{p.nombre + (p.codigo ? " · " + p.codigo : "")}</div>
                  <div className="text-[13px] text-tinta-3">
                    {textoBeneficio(p)} · {p.alcance} · {textoDias(p.dias)} · {p.desde}–{p.hasta}
                  </div>
                </div>
                <Interruptor on={p.activa} label={"Activar " + p.nombre} onChange={() => activar.mutate({ id: p.id, activa: !p.activa })} className="grid h-11 w-[52px] place-items-center" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
