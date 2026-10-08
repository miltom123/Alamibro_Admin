import { useEffect, useState } from "react";
import { Cargando, Interruptor } from "@/components/ui";
import { useAjustes, useGuardarAjustes, useGuardarZona, useZonas } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { sinClave } from "@/lib/formato";
import { api } from "@/lib/api";
import { reiniciarDemo } from "@/lib/api/demo";
import { PANTALLAS, ROLES } from "@/lib/config";
import type { Ajustes as TAjustes, Rol } from "@/lib/tipos";

type Texto = Pick<TAjustes, "abre" | "cierra" | "whatsapp" | "yape" | "plin" | "direccion">;

export default function Ajustes() {
  const { data: ajustes, isLoading } = useAjustes();
  const { data: zonas = [] } = useZonas();
  const guardar = useGuardarAjustes();
  const guardarZona = useGuardarZona();
  const flash = useToast();
  const [f, setF] = useState<Texto | null>(null);
  const [costos, setCostos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ajustes && !f) setF({ abre: ajustes.abre, cierra: ajustes.cierra, whatsapp: ajustes.whatsapp, yape: ajustes.yape, plin: ajustes.plin, direccion: ajustes.direccion });
  }, [ajustes, f]);

  if (isLoading || !ajustes || !f) return <Cargando />;

  const cambiado = (Object.keys(f) as (keyof Texto)[]).some((k) => f[k] !== ajustes[k]);
  function guardarTienda() {
    const wa = f!.whatsapp.replace(/\D/g, "");
    if (wa.length < 9) return flash("Revisa el número de WhatsApp");
    if (f!.abre >= f!.cierra) return flash("La hora de apertura debe ser antes del cierre");
    guardar.mutate({ ...f!, whatsapp: wa }, { onSuccess: () => flash("Ajustes guardados") });
  }

  const campo = (k: keyof Texto, label: string, extra: Record<string, string> = {}) => (
    <label className="flex flex-col gap-1.5 text-[13px] font-bold">
      {label}
      <input className="adm-input min-h-11 rounded-[10px] border border-borde-2 px-3 text-[15px] font-semibold text-tinta" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
    </label>
  );

  return (
    <div className="flex flex-wrap items-start gap-[18px]">
      <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 rounded-[22px] border border-borde bg-white p-5">
        <h3 className="m-0 text-lg font-extrabold">Tienda</h3>
        <Interruptor
          on={ajustes.tiendaAbierta}
          onChange={() => {
            guardar.mutate({ tiendaAbierta: !ajustes.tiendaAbierta });
            flash(ajustes.tiendaAbierta ? "Tienda cerrada: la landing no recibe pedidos" : "Tienda abierta");
          }}
          className="min-h-14 rounded-[14px] border !border-solid border-papel-3 !bg-papel-2 px-3.5 text-left text-[15px] font-bold text-tinta"
        >
          <span className="flex-1">Recibir pedidos de la landing</span>
          <span style={{ color: ajustes.tiendaAbierta ? "#1F7A4A" : "#5E4E42" }}>{ajustes.tiendaAbierta ? "Tienda abierta" : "Tienda cerrada"}</span>
        </Interruptor>
        <div className="grid grid-cols-2 gap-3">
          {campo("abre", "Abre", { type: "time" })}
          {campo("cierra", "Cierra", { type: "time" })}
        </div>
        {campo("whatsapp", "WhatsApp que recibe los pedidos", { inputMode: "tel" })}
        <div className="grid grid-cols-2 gap-3">
          {campo("yape", "Número Yape", { placeholder: "[Tu número Yape]", inputMode: "tel" })}
          {campo("plin", "Número Plin", { placeholder: "[Tu número Plin]", inputMode: "tel" })}
        </div>
        {campo("direccion", "Dirección del local")}
        <button
          type="button"
          onClick={guardarTienda}
          disabled={!cambiado || guardar.isPending}
          className="adm-btn min-h-12 self-start rounded-[14px] border-0 bg-rojo px-5 text-[15px] font-extrabold text-white shadow-[0_6px_0_#8E0F10] disabled:shadow-none"
        >
          Guardar cambios
        </button>
      </section>

      <section className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
        <div className="flex flex-col gap-2.5 rounded-[22px] border border-borde bg-white p-5">
          <h3 className="m-0 text-lg font-extrabold">Zonas de delivery</h3>
          {zonas.map((z) => (
            <div key={z.id} className="flex items-center gap-2.5 rounded-xl bg-papel-2 px-2.5 py-2">
              <span className="flex-1 text-sm font-bold">{z.nombre}</span>
              <label className="flex items-center gap-1.5 text-[13px] text-tinta-2">
                S/
                <input
                  className="adm-input min-h-[38px] w-[70px] rounded-[9px] border border-borde-2 px-2 text-sm font-bold text-tinta"
                  inputMode="decimal"
                  aria-label={"Costo " + z.nombre}
                  value={costos[z.id] ?? String(z.costo)}
                  onChange={(e) => setCostos((c) => ({ ...c, [z.id]: e.target.value }))}
                  onBlur={() => {
                    const v = costos[z.id];
                    if (v === undefined) return;
                    const n = parseFloat(v.replace(",", "."));
                    if (Number.isFinite(n) && n >= 0) guardarZona.mutate({ id: z.id, costo: n });
                    else flash("Costo inválido");
                    setCostos((x) => sinClave(x, z.id));
                  }}
                />
              </label>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 rounded-[22px] border border-borde bg-white p-5">
          <h3 className="m-0 text-lg font-extrabold">Equipo y permisos</h3>
          {(Object.keys(ROLES) as Rol[]).map((k) => (
            <div key={k} className="flex items-center gap-3 rounded-xl bg-papel-2 p-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-fondo text-[13px] font-extrabold text-ambar">{ROLES[k].initial}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">{ROLES[k].label}</div>
                <div className="text-xs text-tinta-3">{ROLES[k].screens.map((x) => PANTALLAS[x].label).join(" · ")}</div>
              </div>
            </div>
          ))}
          <p className="m-0 text-[13px] leading-normal text-tinta-2">
            {api.modo === "supabase"
              ? "Para sumar a alguien: créalo en Supabase → Authentication y asígnale su rol en la tabla «perfiles» (ver docs/backend.md)."
              : "En modo demo cualquiera entra eligiendo su rol. Con Supabase conectado, cada persona tendrá su correo y contraseña."}
          </p>
          {api.modo === "demo" ? (
            <button
              type="button"
              onClick={() => {
                reiniciarDemo();
                location.reload();
              }}
              className="adm-btn min-h-10 self-start rounded-[10px] border border-borde-2 bg-white px-3 text-[13px] font-bold text-tinta"
            >
              Reiniciar datos de ejemplo
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
