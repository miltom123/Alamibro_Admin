import { useUsuario } from "@/hooks/auth";
import { Cargando } from "@/components/ui";
import { useAhora, useAjustes, useGuardarAjustes, usePromos, useResenas } from "@/hooks/datos";
import { DIA_MS, enlaceWa, fechaCorta, primerNombre } from "@/lib/formato";
import { textoBeneficio } from "@/lib/reglas";

export default function Resenas() {
  const usuario = useUsuario();
  const ahora = useAhora(60_000);
  const { data: resenas, isLoading } = useResenas();
  const { data: ajustes } = useAjustes();
  const { data: promos = [] } = usePromos();
  const guardar = useGuardarAjustes();

  if (isLoading || !resenas) return <Cargando />;
  const semana = resenas.filter((r) => r.fecha >= ahora - 7 * DIA_MS);
  const base = semana.length ? semana : resenas;
  const prom = base.length ? base.reduce((a, r) => a + r.estrellas, 0) / base.length : 0;
  const buenas = base.filter((r) => r.estrellas >= 4).length;
  const temas = [...new Set(resenas.map((r) => r.tema).filter(Boolean))];
  const cupon = promos.find((p) => p.codigo === "GRACIASBRO");

  const kpis = [
    { label: "Respuestas", value: String(semana.length), sub: "Últimos 7 días" },
    { label: "Promedio", value: base.length ? prom.toFixed(1) + " ★" : "—", sub: base.length ? Math.round((buenas / base.length) * 100) + "% dieron 4–5 ★" : "Aún sin respuestas" },
    { label: "Invitados a Google", value: String(base.filter((r) => r.invitadoGoogle).length), sub: "Regla automática 4–5 ★" },
    { label: "Cupón entregado", value: cupon?.codigo ?? "GRACIASBRO", sub: cupon ? textoBeneficio(cupon).replace(" OFF", "") + " de descuento" + (cupon.activa ? "" : " · pausado") : "Créalo en Promos" },
  ];

  const encuesta = ajustes?.encuesta ?? [];
  const esAdmin = usuario.rol === "admin";

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="adm-card rounded-[20px] border border-borde bg-white px-5 py-[18px]">
            <div className="text-xs font-extrabold tracking-[1.2px] text-tinta-3 uppercase">{k.label}</div>
            <div className="mt-1.5 text-[30px] font-black">{k.value}</div>
            <div className="mt-1 text-[13px] text-tinta-2">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-[18px]">
        <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-3">
          {temas.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold">Temas a mejorar:</span>
              {temas.map((t) => (
                <span key={t} className="rounded-full border border-[#F2D19A] bg-crema px-3 py-[5px] text-[13px] font-bold text-[#7A4A00]">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {resenas.length === 0 ? <p className="rounded-[18px] border border-borde bg-white p-6 text-tinta-3 italic">Aún no hay respuestas de la encuesta. Se envían desde Pedidos al marcar uno como entregado.</p> : null}
          {resenas.map((r) => (
            <article key={r.id} className="adm-card flex flex-col gap-2 rounded-[18px] border border-borde bg-white px-[18px] py-4">
              <div className="flex flex-wrap justify-between gap-2.5">
                <div>
                  <span className="font-extrabold">{r.nombre}</span>{" "}
                  <span className="text-[13px] text-tinta-3">
                    · {r.pedido} · {fechaCorta(r.fecha, ahora)}
                  </span>
                </div>
                <span aria-label={r.estrellas + " de 5 estrellas"} className="text-lg tracking-[2px] text-ambar-graf">
                  {"★★★★★".slice(0, r.estrellas) + "☆☆☆☆☆".slice(0, 5 - r.estrellas)}
                </span>
              </div>
              {r.texto ? <p className="m-0 text-[15px] leading-normal text-[#3A2A1E] italic">“{r.texto}”</p> : null}
              <div className="flex flex-wrap items-center gap-1.5">
                {r.origen ? <span className="rounded-lg bg-[#EEF3FD] px-[9px] py-[3px] text-xs font-bold text-[#1D4FA8]">{r.origen}</span> : null}
                {r.tema ? <span className="rounded-lg bg-crema px-[9px] py-[3px] text-xs font-bold text-[#7A4A00]">{r.tema}</span> : null}
                {r.invitadoGoogle ? <span className="rounded-lg bg-verde-claro px-[9px] py-[3px] text-xs font-bold text-verde-osc">Invitado a Google</span> : null}
                {r.telefono ? (
                  <a
                    href={enlaceWa(r.telefono, `Hola ${primerNombre(r.nombre)}, gracias por tu comentario sobre tu pedido ${r.pedido}.`)}
                    target="_blank"
                    rel="noopener"
                    className="ml-auto text-[13px] font-extrabold !text-verde-osc"
                  >
                    Responder por WhatsApp
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </section>
        <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-3 rounded-[22px] border border-borde bg-white p-5">
          <h3 className="m-0 text-lg font-extrabold">Encuesta post-pedido</h3>
          <p className="m-0 text-sm text-tinta-2">Se envía por WhatsApp desde Pedidos cuando marcas un pedido como entregado.</p>
          {encuesta.map((q, i) => (
            <button
              key={q.id}
              type="button"
              role="switch"
              aria-checked={q.activa}
              disabled={!esAdmin}
              onClick={() => guardar.mutate({ encuesta: encuesta.map((x, k) => (k === i ? { ...x, activa: !x.activa } : x)) })}
              className="adm-btn flex min-h-12 items-center gap-3 rounded-xl border border-papel-3 bg-papel-2 px-3 text-left text-sm font-semibold text-tinta disabled:!opacity-100"
            >
              <span
                className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] border-2 text-[13px] font-black text-white"
                style={{ background: q.activa ? "#E11D1F" : "#FFFFFF", borderColor: q.activa ? "#E11D1F" : "#CDBFAE" }}
                aria-hidden
              >
                {q.activa ? "✓" : ""}
              </span>
              {q.label}
            </button>
          ))}
          <div className="rounded-[14px] bg-verde-claro p-3.5 text-sm leading-normal text-[#14532D]">
            <b>Regla:</b> 4–5 estrellas → invitación a dejar reseña en Google. 1–3 estrellas → queda aquí para mejorar. Al responder recibe el cupón <b>GRACIASBRO</b>.
          </div>
        </aside>
      </div>
    </div>
  );
}
