import { useMemo, useState } from "react";
import { Cargando, IcoWhatsApp, Modal, Opciones } from "@/components/ui";
import { useUsuario } from "@/hooks/auth";
import { useAhora, useCambiarEstado, useClientes, useMarcarPagado, usePedidoManual, usePedidos, useProductos, useSalsas } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { api } from "@/lib/api";
import { COLUMNAS, COL_META, ESTADO_LABEL, MIN_ATRASO, MIN_AVISO, MODO_LABEL } from "@/lib/config";
import { enlaceWa, inicioDia, minutosDesde, money, primerNombre } from "@/lib/formato";
import { mensajeEstado, parsearMensaje, puedeMarcarSinRespuesta, siguienteEstado, transicionPermitida } from "@/lib/reglas";
import type { Modalidad, Pedido } from "@/lib/tipos";

const EJEMPLO =
  "*NUEVO PEDIDO – ALA MI BRO*\n\n1. *1x Alitas Clásicas* – S/ 37.00\n   12 alitas\n   Salsas: BBQ Ahumada, Acevichada\n   Acompañamiento: Arroz chaufa\n2. *2x Gaseosa 500 ml* – S/ 8.00\n\n*Total referencial:* S/ 45.00\n\n*Nombre:* Valeria Ticona\n*Entrega:* Delivery\n*Dirección:* Calle Zela 715, frente al parque\n*Pago:* Yape";

type Filtro = "todos" | Modalidad;

export default function Pedidos() {
  const usuario = useUsuario();
  const ahora = useAhora();
  const { data: pedidos, isLoading } = usePedidos();
  const [q, setQ] = useState("");
  const [modo, setModo] = useState<Filtro>("todos");
  const [pegar, setPegar] = useState(false);

  const hoy = inicioDia(ahora);
  const delTurno = useMemo(
    () => (pedidos ?? []).filter((o) => o.creadoEn >= hoy || !["entregado", "cancelado", "sin_respuesta"].includes(o.estado)),
    [pedidos, hoy]
  );
  if (isLoading || !pedidos) return <Cargando />;

  const texto = q.trim().toLowerCase();
  const visibles = delTurno.filter(
    (o) =>
      (modo === "todos" || o.modalidad === modo) &&
      (!texto || (o.codigo + " " + o.cliente + " " + o.items.map((i) => i.nombre).join(" ")).toLowerCase().includes(texto))
  );
  const activos = delTurno.filter((o) => !["entregado", "cancelado", "sin_respuesta"].includes(o.estado));
  const atrasados = activos.filter((o) => minutosDesde(o.creadoEn, ahora) > MIN_ATRASO);
  const cuenta = (e: Pedido["estado"]) => delTurno.filter((o) => o.estado === e).length;
  const equipo = usuario.rol !== "cocina";

  const stats = [
    { label: "Nuevos", sub: "Por aceptar", value: cuenta("nuevo"), bg: "#EEF3FD", fg: "#1D4FA8" },
    { label: "En cocina", sub: "Preparándose", value: cuenta("cocina"), bg: "#FFF4E2", fg: "#7A4A00" },
    { label: "Listos", sub: "Por despachar", value: cuenta("listo"), bg: "#F1EAFE", fg: "#5B21B6" },
    { label: "En camino", sub: "Delivery", value: cuenta("camino"), bg: "#FDE7E7", fg: "#8E0F10" },
    { label: "Entregados", sub: "Hoy", value: cuenta("entregado"), bg: "#EAF7EF", fg: "#1F7A4A" },
    { label: "Atrasados", sub: "Más de " + MIN_ATRASO + " min", value: atrasados.length, bg: atrasados.length ? "#D11A1E" : "#F3E9DB", fg: atrasados.length ? "#FFFFFF" : "#5E4E42" },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {stats.map((s) => (
          <div key={s.label} className="adm-card flex items-center gap-3 rounded-[18px] border border-borde bg-white px-4 py-3.5">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-lg font-black" style={{ background: s.bg, color: s.fg }}>
              {s.value}
            </span>
            <div>
              <div className="text-sm font-extrabold">{s.label}</div>
              <div className="text-xs text-tinta-3">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] border border-borde bg-white p-3">
        <label htmlFor="adm-search" className="sr-only">
          Buscar pedido
        </label>
        <input
          id="adm-search"
          type="search"
          className="adm-input min-h-11 flex-[1_1_260px] rounded-xl border border-borde-2 bg-papel-2 px-3.5 text-[15px] font-medium text-tinta"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código, cliente o producto…"
        />
        <Opciones<Filtro>
          label="Modalidad"
          opciones={[
            { id: "todos", label: "Todos" },
            { id: "delivery", label: "Delivery" },
            { id: "recojo", label: "Recojo" },
            { id: "salon", label: "Salón" },
          ]}
          valor={modo}
          onChange={setModo}
          btnClass="min-h-10 rounded-full px-3.5 text-sm"
          className="!gap-1.5"
        />
        {equipo ? (
          <button
            type="button"
            onClick={() => setPegar(true)}
            className="adm-btn flex min-h-11 items-center gap-2 rounded-xl border-0 bg-verde px-4 text-sm font-extrabold text-white"
          >
            <IcoWhatsApp />
            Pegar pedido de WhatsApp
          </button>
        ) : null}
      </div>

      <div className="adm-scroll grid grid-cols-[repeat(5,minmax(272px,1fr))] items-start gap-3.5 overflow-x-auto pb-2">
        {COLUMNAS.map((col) => {
          const lista = visibles
            .filter((o) => o.estado === col || (col === "nuevo" && o.estado === "sin_respuesta"))
            .sort((a, b) => (col === "entregado" ? b.creadoEn - a.creadoEn : a.creadoEn - b.creadoEn));
          const meta = COL_META[col as keyof typeof COL_META];
          return (
            <section key={col} aria-label={meta.title} className="flex min-h-60 flex-col gap-2.5 rounded-[20px] bg-[#EFE6D8] p-2.5">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                <div className="flex-1">
                  <h2 className="m-0 text-base font-extrabold">{meta.title}</h2>
                  <div className="text-xs text-tinta-3">{meta.sub}</div>
                </div>
                <span className="grid h-[26px] min-w-[26px] place-items-center rounded-full bg-white text-[13px] font-extrabold">{lista.length}</span>
              </div>
              {lista.length === 0 ? <p className="m-0 px-2 py-7 text-center text-sm text-tinta-3 italic">Sin pedidos en esta etapa</p> : null}
              {lista.map((o) => (
                <TarjetaPedido key={o.id} o={o} ahora={ahora} />
              ))}
            </section>
          );
        })}
      </div>

      {pegar ? <PegarPedido onClose={() => setPegar(false)} existentes={pedidos} /> : null}
    </div>
  );
}

function TarjetaPedido({ o, ahora }: { o: Pedido; ahora: number }) {
  const usuario = useUsuario();
  const cambiar = useCambiarEstado();
  const pagar = useMarcarPagado();
  const flash = useToast();
  const [confirmarCancel, setConfirmarCancel] = useState(false);

  const mins = minutosDesde(o.creadoEn, ahora);
  const hecho = o.estado === "entregado";
  const atrasado = !hecho && mins > MIN_ATRASO;
  const aviso = !hecho && mins > MIN_AVISO;
  const sig = siguienteEstado(o.estado, o.modalidad);
  const puedeAvanzar = sig && transicionPermitida(o.estado, sig.estado, o.modalidad, usuario.rol);
  const equipo = usuario.rol !== "cocina";
  const meta = COL_META[(o.estado === "sin_respuesta" ? "nuevo" : o.estado) as keyof typeof COL_META];
  const web = o.canal === "web";

  const mover = (estado: Pedido["estado"]) => cambiar.mutate({ id: o.id, estado, codigo: o.codigo, etiqueta: ESTADO_LABEL[estado] });

  async function encuesta() {
    const ventana = window.open("about:blank", "_blank");
    try {
      const url = await api.crearEncuesta(o.id);
      const texto = `Hola ${primerNombre(o.cliente)}, gracias por tu pedido ${o.codigo} en Ala Mi Bro. ¿Nos cuentas qué tal estuvo? Te toma 20 segundos y te regalamos un cupón: ${url}`;
      const link = enlaceWa(o.telefono, texto);
      if (ventana) ventana.location.href = link;
      else window.location.href = link;
    } catch (e) {
      ventana?.close();
      flash(e instanceof Error ? e.message : "No se pudo crear la encuesta");
    }
  }

  return (
    <article
      className="adm-card adm-up flex flex-col gap-2.5 rounded-2xl border bg-white p-3.5"
      style={{ borderColor: atrasado ? "#F4B4B5" : "#EADFCF", borderLeft: "5px solid " + meta.color }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-black tracking-[.3px]">{o.codigo}</span>
        <span
          className={"rounded-full px-[9px] py-1 text-xs font-extrabold " + (atrasado ? "adm-blink" : "")}
          style={{
            background: hecho ? "#EAF7EF" : atrasado ? "#D11A1E" : aviso ? "#FFF4E2" : "#F3E9DB",
            color: hecho ? "#1F7A4A" : atrasado ? "#FFFFFF" : aviso ? "#7A4A00" : "#5E4E42",
          }}
        >
          {hecho ? "Entregado" : mins < 1 ? "Recién" : mins + " min"}
        </span>
      </div>
      <div className="text-base font-bold">{o.cliente}</div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-lg px-[9px] py-[3px] text-xs font-bold" style={{ background: web ? "#FDE7E7" : "#FFF4E2", color: web ? "#8E0F10" : "#7A4A00" }}>
          {web ? "Web / WhatsApp" : "Caja"}
        </span>
        <span className="rounded-lg bg-papel-4 px-[9px] py-[3px] text-xs font-bold text-tinta-2">{MODO_LABEL[o.modalidad]}</span>
        <button
          type="button"
          onClick={() => equipo && pagar.mutate({ id: o.id, pagado: !o.pagado })}
          disabled={!equipo}
          title={equipo ? "Cambiar estado de pago" : undefined}
          className="adm-btn rounded-lg border-0 px-[9px] py-[3px] text-xs font-bold disabled:!opacity-100"
          style={{ background: o.pagado ? "#EAF7EF" : "#FFF4E2", color: o.pagado ? "#1F7A4A" : "#7A4A00" }}
        >
          {o.pagado ? "✓ " + o.pago + " verificado" : o.pago + " · por verificar"}
        </button>
        {o.estado === "sin_respuesta" ? <span className="rounded-lg bg-[#F3E9DB] px-[9px] py-[3px] text-xs font-bold text-tinta-2">Sin respuesta</span> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        {o.items.map((it, i) => (
          <div key={i} className="text-sm leading-[1.4]">
            <b>
              {it.qty}× {it.nombre}
            </b>
            {it.detalle ? <div className="text-[13px] text-tinta-2">{it.detalle}</div> : null}
          </div>
        ))}
      </div>
      {o.nota ? <div className="rounded-[10px] border-l-[3px] border-ambar-graf bg-crema px-2.5 py-2 text-[13px] text-[#5A3A10] italic">{o.nota}</div> : null}
      {o.modalidad === "delivery" && o.direccion ? <div className="text-[13px] font-semibold text-[#1D4FA8]">{o.direccion}</div> : null}
      <div className="flex items-center gap-2 border-t border-borde-3 pt-1.5">
        <span className="tabular min-w-0 flex-1 text-[17px] font-black whitespace-nowrap text-rojo-texto">{money(o.total)}</span>
        <a
          href={enlaceWa(o.telefono, mensajeEstado(o))}
          target="_blank"
          rel="noopener"
          aria-label="Avisar al cliente por WhatsApp"
          title="Avisar al cliente por WhatsApp"
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#CDE9D8] bg-verde-claro !text-verde-osc"
        >
          <IcoWhatsApp />
        </a>
        {hecho && equipo ? (
          <button type="button" onClick={encuesta} className="adm-btn min-h-10 rounded-[10px] border border-borde-2 bg-white px-3 text-[13px] font-extrabold text-tinta">
            Enviar encuesta
          </button>
        ) : null}
        {puedeAvanzar && sig ? (
          <button
            type="button"
            onClick={() => mover(sig.estado)}
            disabled={cambiar.isPending}
            className="adm-btn min-h-10 rounded-[10px] border-0 px-3 text-[13px] font-extrabold whitespace-nowrap text-white"
            style={{ background: sig.color }}
          >
            {sig.label}
          </button>
        ) : null}
      </div>
      {equipo && !["entregado", "cancelado"].includes(o.estado) ? (
        <div className="flex flex-wrap items-center justify-end gap-2 text-[13px]">
          {puedeMarcarSinRespuesta(o, ahora) ? (
            <button type="button" onClick={() => mover("sin_respuesta")} className="adm-btn rounded-lg border-0 bg-papel-4 px-2.5 py-1.5 font-bold text-tinta-2">
              Sin respuesta
            </button>
          ) : null}
          {confirmarCancel ? (
            <>
              <span className="font-bold text-rojo-texto">¿Cancelar pedido?</span>
              <button type="button" onClick={() => mover("cancelado")} className="adm-btn rounded-lg border-0 bg-rojo px-2.5 py-1.5 font-bold text-white">
                Sí, cancelar
              </button>
              <button type="button" onClick={() => setConfirmarCancel(false)} className="adm-btn rounded-lg border border-borde-2 bg-white px-2.5 py-1.5 font-bold text-tinta">
                No
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmarCancel(true)} className="adm-btn rounded-lg border-0 bg-transparent px-1.5 py-1.5 font-semibold text-tinta-3 underline">
              Cancelar
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function PegarPedido({ onClose, existentes }: { onClose: () => void; existentes: Pedido[] }) {
  const [texto, setTexto] = useState("");
  const { data: productos = [] } = useProductos();
  const { data: salsas = [] } = useSalsas();
  const { data: clientes = [] } = useClientes();
  const crear = usePedidoManual();
  const flash = useToast();
  const p = texto.trim() ? parsearMensaje(texto, productos, salsas) : null;
  const duplicado = p?.codigo ? existentes.find((o) => o.codigo === p.codigo) : undefined;

  let vista = "";
  let ok = true;
  if (p) {
    if (duplicado) {
      vista = `${duplicado.codigo} ya está registrado (llegó desde la web). No hace falta crearlo.`;
      ok = false;
    } else if (p.items.length) vista = `Detectado: ${p.items.length} producto(s) · ${p.cliente || "sin nombre"} · ${MODO_LABEL[p.modalidad]} · ${money(p.total)}`;
    else {
      vista = "Aún no detecto productos. Pega el mensaje completo de la landing.";
      ok = false;
    }
  }

  function crearPedido() {
    if (!p || !p.items.length) return flash("No encontré productos en el mensaje");
    if (duplicado) return flash(duplicado.codigo + " ya está registrado");
    // Si el cliente ya existe, se usa su teléfono para poder avisarle por WhatsApp.
    const conocido = clientes.find((c) => c.nombre.toLowerCase() === p.cliente.toLowerCase());
    crear.mutate(
      { cliente: p.cliente || "Cliente WhatsApp", telefono: conocido?.telefono ?? "", canal: "web", modalidad: p.modalidad, direccion: p.direccion, pago: p.pago, pagado: false, estado: "nuevo", nota: "", items: p.items },
      { onSuccess: onClose }
    );
  }

  return (
    <Modal titulo="Pegar pedido de WhatsApp" onClose={onClose}>
      <p className="-mt-2 mb-0 text-sm text-tinta-2">Copia el mensaje que llega desde la landing y pégalo aquí. Lo convertimos en un pedido nuevo.</p>
      <label htmlFor="adm-paste" className="sr-only">
        Mensaje de WhatsApp
      </label>
      <textarea
        id="adm-paste"
        className="adm-input resize-y rounded-xl border border-borde-2 p-3 font-mono text-sm leading-normal text-tinta"
        rows={10}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="*NUEVO PEDIDO – ALA MI BRO*…"
      />
      {vista ? (
        <div className="rounded-xl px-3.5 py-3 text-sm font-bold" style={{ background: ok ? "#EAF7EF" : "#FFF4E2", color: ok ? "#14532D" : "#7A4A00" }}>
          {vista}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={() => setTexto(EJEMPLO)} className="adm-btn min-h-[46px] rounded-xl border border-borde-2 bg-white px-4 text-sm font-bold text-tinta">
          Usar ejemplo
        </button>
        <button type="button" onClick={crearPedido} disabled={crear.isPending} className="adm-btn min-h-[46px] rounded-xl border-0 bg-verde px-[18px] text-sm font-extrabold text-white">
          Crear pedido
        </button>
      </div>
    </Modal>
  );
}
