import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarraFila, BarrasVentas, COLOR_CANAL } from "@/components/Graficos";
import { Cargando, Segmentado } from "@/components/ui";
import { useAhora, useNombreSalsa, usePedidos, useProductos, useSalsas } from "@/hooks/datos";
import { COL_META, DIAS_PROMO_3X2, MIN_ATRASO, STOCK_BAJO } from "@/lib/config";
import { moneyK, minutosDesde } from "@/lib/formato";
import { calcularResumen, esFinal, type Rango } from "@/lib/reglas";
import { RANGOS, kpisDe } from "@/lib/kpis";

const CANALES = [
  { id: "web", label: "Web / WhatsApp" },
  { id: "recojo", label: "Caja: recojo y teléfono" },
  { id: "salon", label: "Consumo en salón" },
] as const;

export default function Inicio() {
  const [rango, setRango] = useState<Rango>("hoy");
  const ahora = useAhora();
  const nav = useNavigate();
  const { data: pedidos, isLoading } = usePedidos();
  const { data: productos = [] } = useProductos();
  const { data: salsas = [] } = useSalsas();
  const nombreSalsa = useNombreSalsa();

  const r = useMemo(() => calcularResumen(pedidos ?? [], rango, ahora, nombreSalsa), [pedidos, rango, ahora, nombreSalsa]);
  if (isLoading || !pedidos) return <Cargando />;

  const dow = new Date(ahora).getDay();
  const esPromo = DIAS_PROMO_3X2.includes(dow);
  const activos = pedidos.filter((o) => !esFinal(o.estado) && o.estado !== "sin_respuesta");
  const nuevos = pedidos.filter((o) => o.estado === "nuevo").length;
  const atrasados = activos.filter((o) => minutosDesde(o.creadoEn, ahora) > MIN_ATRASO);
  const porVerificar = activos.filter((o) => !o.pagado);
  const stockBajo = productos.filter((p) => p.disponible && p.stock <= STOCK_BAJO);
  const salsasOff = salsas.filter((s) => !s.disponible);

  const alertas: { title: string; sub: string; cta: string; bg: string; icono: string; ir: () => void }[] = [];
  atrasados.forEach((o) =>
    alertas.push({ title: `${o.codigo} lleva ${minutosDesde(o.creadoEn, ahora)} min`, sub: o.cliente + " · " + (COL_META[o.estado as keyof typeof COL_META]?.title ?? o.estado), cta: "Ver", bg: "#FDE7E7", icono: "#D11A1E", ir: () => nav("/pedidos") })
  );
  if (porVerificar.length)
    alertas.push({
      title: porVerificar.length + (porVerificar.length === 1 ? " pago por verificar" : " pagos por verificar"),
      sub: porVerificar.map((o) => o.codigo).join(", "),
      cta: "Revisar",
      bg: "#FFF4E2",
      icono: "#D68A00",
      ir: () => nav("/pedidos"),
    });
  stockBajo.forEach((p) => alertas.push({ title: "Stock bajo: " + p.nombre, sub: "Quedan " + p.stock + " porciones", cta: "Reponer", bg: "#FFF4E2", icono: "#D68A00", ir: () => nav("/carta") }));
  if (salsasOff.length)
    alertas.push({ title: "Salsa agotada: " + salsasOff.map((s) => s.nombre).join(", "), sub: "No aparece en la landing", cta: "Activar", bg: "#F3E9DB", icono: "#5E4E42", ir: () => nav("/carta?tab=salsas") });

  const totalCanales = r.canales.web + r.canales.recojo + r.canales.salon;
  const topMax = Math.max(...r.top.map((t) => t.importe), 1);
  const salsaMax = Math.max(...r.salsas.map((s) => s.pct), 1);

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="adm-up flex flex-wrap items-center gap-[18px] rounded-[22px] bg-fondo px-[22px] py-[18px] text-crema">
        <span className="font-titulo text-[40px] leading-none text-ambar">{esPromo ? "3x2" : "HOY"}</span>
        <div className="min-w-0 flex-[1_1_260px]">
          <div className="text-lg font-extrabold">{esPromo ? "Hoy es día de 3x2 en alitas" : "Hoy no hay 3x2 en alitas"}</div>
          <div className="mt-[3px] text-sm text-texto-2-osc">
            {esPromo ? "Asegura stock de alitas y salsas antes de las 7 PM, que es cuando más se pide." : "Revisa Promos y cupones si quieres activar algo para hoy."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { label: "En curso", value: activos.length, color: "#FFF4E2" },
            { label: "Por aceptar", value: nuevos, color: "#FFB21A" },
            { label: "Atrasados", value: atrasados.length, color: atrasados.length ? "#FF6B6D" : "#3DDC84" },
          ].map((s) => (
            <div key={s.label} className="min-w-28 rounded-[14px] bg-oscuro-2 px-3.5 py-2.5">
              <div className="text-xs font-semibold text-texto-2-osc">{s.label}</div>
              <div className="tabular text-[22px] font-black" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold">Resumen de ventas</h2>
        <Segmentado opciones={RANGOS} valor={rango} onChange={setRango} label="Periodo" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {kpisDe(r).map((k, i) => (
          <div
            key={k.label}
            className="adm-card adm-up flex flex-col gap-2 rounded-[20px] border border-borde bg-white px-5 py-[18px]"
            style={{ borderTop: "5px solid " + k.accent, animationDelay: i * 0.06 + "s" }}
          >
            <div className="text-xs font-extrabold tracking-[1.2px] text-tinta-3 uppercase">{k.label}</div>
            <div className="tabular text-[32px] leading-none font-black">{k.value}</div>
            <div className="self-start rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: k.chip[0], color: k.chip[1] }}>
              {k.note}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <section className="adm-card flex min-w-0 flex-[2_1_520px] flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-[22px]">
          <div>
            <h3 className="m-0 text-lg font-extrabold">{r.titulo}</h3>
            <p className="mt-[3px] mb-0 text-sm text-tinta-2">{r.sub}</p>
          </div>
          <BarrasVentas barras={r.barras} />
        </section>

        <section className="adm-card flex min-w-0 flex-[1_1_320px] flex-col gap-4 rounded-[22px] border border-borde bg-white p-[22px]">
          <div>
            <h3 className="m-0 text-lg font-extrabold">Pedidos por canal</h3>
            <p className="mt-[3px] mb-0 text-sm text-tinta-2">De dónde llegan tus ventas</p>
          </div>
          <div className="flex h-[22px] gap-0.5 overflow-hidden rounded-md bg-white" aria-hidden>
            {CANALES.map((c) => (
              <div key={c.id} className="adm-barx" title={c.label} style={{ width: totalCanales ? (r.canales[c.id] / totalCanales) * 100 + "%" : "0%", background: COLOR_CANAL[c.id] }} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {CANALES.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 text-[15px]">
                <span className="h-3 w-3 flex-none rounded" style={{ background: COLOR_CANAL[c.id] }} />
                <span className="flex-1 font-semibold">{c.label}</span>
                <span className="tabular font-extrabold">{totalCanales ? Math.round((r.canales[c.id] / totalCanales) * 100) : 0}%</span>
                <span className="tabular w-[92px] text-right text-[13px] text-tinta-3">{r.canales[c.id]} pedidos</span>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-[14px] bg-crema px-3.5 py-3 text-sm leading-[1.45] font-semibold text-[#5A3A10]">
            La landing ya trae {totalCanales ? Math.round((r.canales.web / totalCanales) * 100) : 0}% de tus pedidos. Comparte el enlace en cada historia de Instagram.
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-4">
        <section className="adm-card flex min-w-0 flex-[1_1_380px] flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-[22px]">
          <h3 className="m-0 text-lg font-extrabold">Top productos</h3>
          {r.top.length === 0 ? <p className="m-0 text-tinta-3 italic">Aún no hay ventas en este periodo.</p> : null}
          {r.top.map((t, i) => (
            <div key={t.nombre} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2.5 text-[15px]">
                <span className="font-bold">
                  {i + 1}. {t.nombre}
                </span>
                <span className="tabular text-tinta-2">
                  <b className="text-tinta">{t.qty} und</b> · {moneyK(t.importe)}
                </span>
              </div>
              <BarraFila pct={(t.importe / topMax) * 100} color="#D11A1E" delay={i * 0.08} />
            </div>
          ))}
        </section>
        <section className="adm-card flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-[22px]">
          <div>
            <h3 className="m-0 text-lg font-extrabold">Salsas más pedidas</h3>
            <p className="mt-[3px] mb-0 text-sm text-tinta-2">% de porciones con salsa</p>
          </div>
          {r.salsas.length === 0 ? <p className="m-0 text-tinta-3 italic">Sin datos en este periodo.</p> : null}
          {r.salsas.map((s, i) => (
            <div key={s.nombre} className="flex items-center gap-3 text-[15px]">
              <span className="w-[132px] flex-none font-semibold">{s.nombre}</span>
              <BarraFila pct={(s.pct / salsaMax) * 100} color="#D68A00" delay={i * 0.06} alto={10} />
              <span className="tabular w-10 text-right font-extrabold">{s.pct}%</span>
            </div>
          ))}
        </section>
        <section className="adm-card flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[22px] border border-borde bg-white p-[22px]">
          <div className="flex items-center justify-between">
            <h3 className="m-0 text-lg font-extrabold">Atención ahora</h3>
            <span className="rounded-full px-2.5 py-1 text-[13px] font-extrabold text-white" style={{ background: alertas.length ? "#D11A1E" : "#1F9D55" }}>
              {alertas.length}
            </span>
          </div>
          {alertas.length === 0 ? <p className="m-0 font-bold text-verde-osc">Todo en orden. ¡Buen turno, bro!</p> : null}
          {alertas.map((a) => (
            <div key={a.title} className="flex items-center gap-3 rounded-[14px] px-3.5 py-3" style={{ background: a.bg }}>
              <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] font-black text-white" style={{ background: a.icono }} aria-hidden>
                !
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">{a.title}</div>
                <div className="text-[13px] break-words text-tinta-2">{a.sub}</div>
              </div>
              <button type="button" onClick={a.ir} className="adm-btn min-h-9 flex-none rounded-[10px] border-0 bg-fondo px-3 text-[13px] font-bold text-crema">
                {a.cta}
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
