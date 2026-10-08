import { useMemo, useState } from "react";
import { Cargando, sel } from "@/components/ui";
import { useAhora, useClientes } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { enlaceWa, haceDias, iniciales, money } from "@/lib/formato";
import { personalizar, segmento } from "@/lib/reglas";
import type { Segmento } from "@/lib/tipos";

type Filtro = "Todos" | Segmento;
const SEGMENTOS: Filtro[] = ["Todos", "VIP", "Frecuente", "Nuevo", "Inactivo"];
const ESTILO: Record<Segmento, [string, string]> = {
  VIP: ["#16100D", "#FFB21A"],
  Frecuente: ["#EAF7EF", "#1F7A4A"],
  Nuevo: ["#EEF3FD", "#1D4FA8"],
  Inactivo: ["#F3E9DB", "#5E4E42"],
};

export default function Clientes() {
  const { data: clientes, isLoading } = useClientes();
  const ahora = useAhora(60_000);
  const flash = useToast();
  const [seg, setSeg] = useState<Filtro>("Todos");
  const [plantilla, setPlantilla] = useState("Hola {nombre}, hoy hay 3x2 en alitas en Ala Mi Bro. Arma tu pedido aquí: alamibro.pe — te esperamos, bro.");
  const [cola, setCola] = useState<{ nombre: string; telefono: string; texto: string; enviado: boolean }[]>([]);

  const conSeg = useMemo(() => (clientes ?? []).map((c) => ({ ...c, seg: segmento(c, ahora) })), [clientes, ahora]);
  if (isLoading || !clientes) return <Cargando />;

  const lista = conSeg.filter((c) => seg === "Todos" || c.seg === seg);
  const conTelefono = lista.filter((c) => c.telefono);
  const primero = lista[0] ?? conSeg[0];
  const enviados = cola.filter((x) => x.enviado).length;

  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <section className="flex min-w-0 flex-[3_1_520px] flex-col gap-3.5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Segmento">
          {SEGMENTOS.map((s) => {
            const on = seg === s;
            const n = s === "Todos" ? conSeg.length : conSeg.filter((c) => c.seg === s).length;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSeg(s);
                  setCola([]);
                }}
                className="adm-btn flex min-h-[42px] items-center gap-2 rounded-full border border-solid px-4 text-sm font-bold"
                style={sel(on)}
              >
                {s}
                <span className="rounded-full px-2 py-px text-xs" style={{ background: on ? "rgba(255,255,255,.18)" : "#F3E9DB" }}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <div className="overflow-x-auto rounded-[20px] border border-borde bg-white">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="text-left text-xs tracking-[1px] text-tinta-3 uppercase">
                <th className="px-[18px] py-3.5">Cliente</th>
                <th className="px-2.5 py-3.5">Segmento</th>
                <th className="px-2.5 py-3.5 text-right">Pedidos</th>
                <th className="px-2.5 py-3.5 text-right">Gastado</th>
                <th className="px-2.5 py-3.5">Último</th>
                <th className="px-2.5 py-3.5">Salsa favorita</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-[18px] py-8 text-center text-tinta-3 italic">
                    No hay clientes en este segmento.
                  </td>
                </tr>
              ) : null}
              {lista.map((c) => (
                <tr key={c.id} className="adm-row border-t border-borde-3 text-[15px]">
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-fondo text-[13px] font-extrabold text-ambar">{iniciales(c.nombre)}</span>
                      <div>
                        <div className="font-extrabold">{c.nombre}</div>
                        <div className="text-xs text-tinta-3">{c.origen}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2.5 py-3">
                    <span className="rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ background: ESTILO[c.seg][0], color: ESTILO[c.seg][1] }}>
                      {c.seg}
                    </span>
                  </td>
                  <td className="tabular px-2.5 py-3 text-right font-extrabold">{c.pedidos}</td>
                  <td className="tabular px-2.5 py-3 text-right whitespace-nowrap">{money(c.gastado)}</td>
                  <td className="px-2.5 py-3 whitespace-nowrap text-tinta-2">{haceDias(c.ultimoPedido, ahora)}</td>
                  <td className="px-2.5 py-3">{c.salsaFavorita}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="flex min-w-0 flex-[2_1_340px] flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-5">
        <div>
          <h3 className="m-0 text-lg font-extrabold">Campaña por WhatsApp</h3>
          <p className="mt-[3px] mb-0 text-sm text-tinta-2">
            Se envía al segmento elegido a la izquierda: <b>{seg}</b> ({conTelefono.length}).
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          <span>
            Mensaje <span className="font-medium text-tinta-3">Usa {"{nombre}"} para personalizar</span>
          </span>
          <textarea className="adm-input resize-y rounded-xl border border-borde-2 p-3 text-[15px] leading-[1.45] font-medium text-tinta" rows={4} value={plantilla} onChange={(e) => setPlantilla(e.target.value)} />
        </label>
        <div className="flex flex-col gap-2 rounded-[18px] bg-fondo p-4">
          <span className="text-xs font-extrabold tracking-[1.5px] text-ambar-claro">ASÍ LO VERÁ {(primero?.nombre.split(" ")[0] ?? "EL CLIENTE").toUpperCase()}</span>
          <div className="max-w-[92%] self-end rounded-[14px_14px_4px_14px] bg-crema px-3 py-2.5 text-sm leading-[1.45] whitespace-pre-wrap text-tinta">{personalizar(plantilla, primero?.nombre ?? "bro")}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setCola(conTelefono.map((c) => ({ nombre: c.nombre, telefono: c.telefono, texto: personalizar(plantilla, c.nombre), enviado: false })));
            flash("Cola lista: " + conTelefono.length + " mensajes");
          }}
          disabled={!conTelefono.length}
          className="adm-btn adm-shine min-h-[50px] rounded-[14px] border-0 bg-verde text-[15px] font-extrabold text-white"
        >
          Preparar envío a {conTelefono.length} clientes
        </button>
        {cola.length ? (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm font-bold">
              <span>Cola de envío</span>
              <span className="tabular" aria-live="polite">
                {enviados} de {cola.length} enviados
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-verde-claro">
              <div className="h-full bg-verde transition-[width] duration-400" style={{ width: Math.round((enviados / cola.length) * 100) + "%" }} />
            </div>
            {cola.map((x, i) => (
              <div key={x.telefono} className="flex items-center gap-2.5 rounded-xl bg-papel-2 px-2.5 py-2">
                <span className="flex-1 text-sm font-bold">{x.nombre}</span>
                <a
                  href={enlaceWa(x.telefono, x.texto)}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setCola((c) => c.map((y, k) => (k === i ? { ...y, enviado: true } : y)))}
                  className="flex min-h-9 items-center rounded-[10px] px-3 text-[13px] font-extrabold no-underline"
                  style={{ background: x.enviado ? "#EAF7EF" : "#1F9D55", color: x.enviado ? "#1F7A4A" : "#FFFFFF" }}
                >
                  {x.enviado ? "✓ Enviado" : "Enviar"}
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
