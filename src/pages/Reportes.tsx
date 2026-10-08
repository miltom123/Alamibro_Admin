import { useMemo, useState } from "react";
import { BarrasVentas } from "@/components/Graficos";
import { Cargando, Segmentado } from "@/components/ui";
import { useAhora, useNombreSalsa, usePedidos, useProductos } from "@/hooks/datos";
import { STOCK_BAJO } from "@/lib/config";
import { inicioDia, moneyK } from "@/lib/formato";
import { calcularResumen, csvPedidos, csvProductos, dataUri, oportunidades, type Rango } from "@/lib/reglas";
import { RANGOS, kpisDe } from "@/lib/kpis";

export default function Reportes() {
  const [rango, setRango] = useState<Rango>("hoy");
  const ahora = useAhora(60_000);
  const { data: pedidos, isLoading } = usePedidos();
  const { data: productos = [] } = useProductos();
  const nombreSalsa = useNombreSalsa();

  const r = useMemo(() => calcularResumen(pedidos ?? [], rango, ahora, nombreSalsa), [pedidos, rango, ahora, nombreSalsa]);
  const semana = useMemo(() => calcularResumen(pedidos ?? [], "semana", ahora, nombreSalsa), [pedidos, ahora, nombreSalsa]);
  if (isLoading || !pedidos) return <Cargando />;

  const delTurno = pedidos.filter((o) => o.creadoEn >= inicioDia(ahora)).sort((a, b) => a.creadoEn - b.creadoEn);
  const ideas = oportunidades(semana, productos.filter((p) => p.disponible && p.stock <= STOCK_BAJO));
  const hoyIso = new Date(ahora).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado opciones={RANGOS} valor={rango} onChange={setRango} label="Periodo" />
        <div className="flex flex-wrap gap-2">
          <a
            href={dataUri(csvProductos(r.top))}
            download={`alamibro-productos-${rango}-${hoyIso}.csv`}
            className="flex min-h-[42px] items-center rounded-xl border border-borde-2 bg-white px-3.5 text-sm font-bold !text-tinta no-underline"
          >
            Productos · CSV
          </a>
          <a
            href={dataUri(csvPedidos(delTurno))}
            download={`alamibro-pedidos-${hoyIso}.csv`}
            className="flex min-h-[42px] items-center rounded-xl bg-rojo px-3.5 text-sm font-extrabold !text-white no-underline"
          >
            Pedidos del turno · CSV
          </a>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpisDe(r).map((k) => (
          <div key={k.label} className="adm-card rounded-[20px] border border-borde bg-white px-5 py-[18px]">
            <div className="text-xs font-extrabold tracking-[1.2px] text-tinta-3 uppercase">{k.label}</div>
            <div className="tabular mt-1.5 text-[30px] font-black">{k.value}</div>
            <div className="mt-1 text-[13px] text-tinta-2">{k.note}</div>
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-3 rounded-[22px] border border-borde bg-white p-[22px]">
        <div>
          <h3 className="m-0 text-lg font-extrabold">{r.titulo}</h3>
          <p className="mt-[3px] mb-0 text-sm text-tinta-2">{r.sub}</p>
        </div>
        <BarrasVentas barras={r.barras} />
      </section>
      <div className="flex flex-wrap items-start gap-[18px]">
        <section className="min-w-0 flex-[3_1_480px] overflow-x-auto rounded-[22px] border border-borde bg-white">
          <div className="px-[18px] py-4 text-base font-extrabold">Productos más vendidos</div>
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr className="text-left text-xs tracking-[1px] text-tinta-3 uppercase">
                <th className="px-[18px] py-2.5">Producto</th>
                <th className="px-2.5 py-2.5 text-right">Unidades</th>
                <th className="px-2.5 py-2.5 text-right">Importe</th>
                <th className="px-[18px] py-2.5 text-right">% ventas</th>
              </tr>
            </thead>
            <tbody>
              {r.top.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-[18px] py-6 text-center text-tinta-3 italic">
                    Sin ventas en este periodo.
                  </td>
                </tr>
              ) : null}
              {r.top.map((t) => (
                <tr key={t.nombre} className="adm-row border-t border-borde-3 text-[15px]">
                  <td className="px-[18px] py-3 font-bold">{t.nombre}</td>
                  <td className="tabular px-2.5 py-3 text-right whitespace-nowrap">{t.qty} und</td>
                  <td className="tabular px-2.5 py-3 text-right whitespace-nowrap">{moneyK(t.importe)}</td>
                  <td className="tabular px-[18px] py-3 text-right font-extrabold">{r.ventas ? Math.round((t.importe / r.ventas) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5 rounded-[22px] bg-fondo p-5 text-crema">
          <span className="text-xs font-extrabold tracking-[1.5px] text-ambar-claro">OPORTUNIDADES PARA PROBAR</span>
          {ideas.map((i) => (
            <div key={i.title} className="flex flex-col gap-1.5 rounded-[14px] bg-oscuro-2 p-3.5">
              <span className="text-[15px] font-extrabold">{i.title}</span>
              <span className="text-sm leading-normal text-crema-3">{i.text}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
