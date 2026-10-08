import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { iniciales } from "@/lib/formato";

/** Estilo de botón seleccionable del diseño (oscuro cuando está activo). */
export const sel = (on: boolean) =>
  on
    ? { background: "#16100D", color: "#FFF4E2", borderColor: "#16100D", boxShadow: "0 6px 14px -8px rgba(0,0,0,.5)" }
    : { background: "#FFFFFF", color: "#3A2A1E", borderColor: "#E6D9C6", boxShadow: "none" };

/** Interruptor accesible (role="switch"). */
export function Interruptor({
  on,
  onChange,
  label,
  children,
  className = "",
  ...rest
}: {
  on: boolean;
  onChange: () => void;
  label?: string;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={"adm-btn flex items-center gap-2.5 border-0 bg-transparent " + className}
      {...rest}
    >
      <span
        className="flex h-[26px] w-[46px] flex-none rounded-full p-[3px] transition-colors"
        style={{ background: on ? "#1F9D55" : "#CDBFAE", justifyContent: on ? "flex-end" : "flex-start" }}
      >
        <span className="h-5 w-5 rounded-full bg-white" />
      </span>
      {children}
    </button>
  );
}

/** Grupo de opciones tipo "píldora" (aria-pressed). */
export function Opciones<T extends string | number>({
  opciones,
  valor,
  onChange,
  label,
  className = "",
  btnClass = "min-h-[42px] rounded-full px-4 text-sm",
  role = "group",
}: {
  opciones: { id: T; label: ReactNode }[];
  valor: T | T[];
  onChange: (v: T) => void;
  label?: string;
  className?: string;
  btnClass?: string;
  role?: "group" | "tablist";
}) {
  const on = (id: T) => (Array.isArray(valor) ? valor.includes(id) : valor === id);
  return (
    <div role={role} aria-label={label} className={"flex flex-wrap gap-2 " + className}>
      {opciones.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role={role === "tablist" ? "tab" : undefined}
          aria-selected={role === "tablist" ? on(o.id) : undefined}
          aria-pressed={role === "group" ? on(o.id) : undefined}
          onClick={() => onChange(o.id)}
          className={"adm-btn border border-solid font-bold " + btnClass}
          style={sel(on(o.id))}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Selector segmentado sobre fondo crema (Hoy / Semana / Mes, pestañas). */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
  label,
  role = "group",
}: {
  opciones: { id: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  label?: string;
  role?: "group" | "tablist";
}) {
  return (
    <div role={role} aria-label={label} className="flex gap-1.5 rounded-[14px] bg-papel-3 p-1">
      {opciones.map((o) => {
        const on = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? on : undefined}
            aria-pressed={role === "group" ? on : undefined}
            onClick={() => onChange(o.id)}
            className="adm-btn min-h-[38px] rounded-[10px] border-0 px-4 text-sm font-bold"
            style={{ background: on ? "#16100D" : "transparent", color: on ? "#FFF4E2" : "#3A2A1E", boxShadow: on ? "0 6px 14px -8px rgba(0,0,0,.5)" : "none" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Campo({ label, extra, className = "", ...rest }: { label: ReactNode; extra?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={"flex flex-col gap-1.5 text-[13px] font-bold " + className}>
      <span>
        {label} {extra}
      </span>
      <input
        className="adm-input min-h-11 rounded-[10px] border border-borde-2 bg-white px-3 text-[15px] font-medium text-tinta"
        {...rest}
      />
    </label>
  );
}

export function Tarjeta({ children, className = "", oscura = false }: { children: ReactNode; className?: string; oscura?: boolean }) {
  return (
    <section
      className={
        (oscura ? "bg-fondo text-crema " : "border border-borde bg-white ") + "flex min-w-0 flex-col gap-3.5 rounded-[22px] p-5 " + className
      }
    >
      {children}
    </section>
  );
}

export function TituloTarjeta({ titulo, sub }: { titulo: string; sub?: ReactNode }) {
  return (
    <div>
      <h3 className="m-0 text-lg font-extrabold">{titulo}</h3>
      {sub ? <p className="mt-[3px] mb-0 text-sm text-tinta-2">{sub}</p> : null}
    </div>
  );
}

/** Foto del producto o sus iniciales sobre el color de la carta. */
export function Miniatura({ img, tile, nombre, className = "", texto = "text-[34px]" }: { img?: string | null; tile?: string | null; nombre: string; className?: string; texto?: string }) {
  return (
    <div className={"relative grid place-items-center overflow-hidden " + className} style={{ background: tile || "#2A1E18" }}>
      {img ? (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className={"font-titulo text-crema " + texto}>{iniciales(nombre)}</span>
      )}
    </div>
  );
}

/** Diálogo modal: Escape cierra, foco al abrir, scroll del fondo bloqueado. */
export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const ov = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = ov;
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(22,16,13,.7)] p-3 backdrop-blur-[4px]">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="adm-up flex max-h-[calc(100dvh-24px)] w-[min(640px,100%)] flex-col gap-3.5 overflow-y-auto rounded-3xl bg-white p-[22px] outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="m-0 font-titulo text-[28px] font-normal">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="adm-btn h-11 w-11 flex-none rounded-full border border-borde-2 bg-white text-lg font-extrabold text-tinta"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const IcoWhatsApp = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z" />
  </svg>
);

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 p-8 text-tinta-2" role="status">
      <span className="adm-spin h-5 w-5 rounded-full border-[3px] border-borde-2 border-t-rojo" style={{ animationDuration: ".8s" }} />
      {texto}
    </div>
  );
}
