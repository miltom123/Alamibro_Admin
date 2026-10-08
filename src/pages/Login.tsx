import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth";
import { useToast } from "@/hooks/toast";
import { api } from "@/lib/api";
import { DIAS_PROMO_3X2, ROLES } from "@/lib/config";
import type { Rol } from "@/lib/tipos";

const LOGO = "/img/logo-alamibro.webp";
const DEMO = api.modo === "demo";

export default function Login() {
  const { usuario, login } = useAuth();
  const nav = useNavigate();
  const flash = useToast();
  const [rol, setRol] = useState<Rol>("admin");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [cargando, setCargando] = useState(false);

  if (usuario) return <Navigate to={"/" + ROLES[usuario.rol].screens[0]} replace />;

  const h = new Date().getHours();
  const saludo = (h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches") + ", bro";
  const promoHoy = DIAS_PROMO_3X2.includes(new Date().getDay());

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (DEMO && (user.trim().length < 3 || pass.length < 4)) {
      setError("Revisa tu usuario (3+ letras) y contraseña (4+ caracteres).");
      setIntento((x) => x + 1);
      return;
    }
    if (!DEMO && (!user.includes("@") || pass.length < 6)) {
      setError("Escribe tu correo y tu contraseña (6+ caracteres).");
      setIntento((x) => x + 1);
      return;
    }
    setCargando(true);
    setError("");
    try {
      const u = await login({ usuario: user, password: pass, rol });
      flash("¡Bienvenido, " + u.nombre + "!");
      nav("/" + ROLES[u.rol].screens[0], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
      setIntento((x) => x + 1);
    } finally {
      setCargando(false);
    }
  }

  const userMal = !!error && (DEMO ? user.trim().length < 3 : !user.includes("@"));
  const passMal = !!error && pass.length < (DEMO ? 4 : 6);

  return (
    <main className="flex min-h-screen flex-wrap bg-fondo">
      <section className="relative flex min-h-[560px] min-w-0 flex-[1_1_520px] flex-col justify-between max-md:min-h-0 max-md:gap-4 max-md:py-6 overflow-hidden bg-fondo px-[clamp(24px,4vw,56px)] py-9 text-crema">
        <div className="adm-spin-r absolute -top-[180px] -right-[180px] h-[560px] w-[560px] rounded-full border-2 border-dashed border-oscuro-borde-2" />
        <div className="absolute -bottom-40 -left-[120px] h-[420px] w-[420px] rounded-full bg-rojo opacity-[.14]" />
        <div className="absolute top-0 right-[7%] h-full w-[74px] overflow-hidden opacity-90" aria-hidden>
          <div className="adm-marq flex flex-col gap-[22px] font-titulo text-[30px] whitespace-nowrap text-[#2E221C]" style={{ writingMode: "vertical-rl" }}>
            <span>ALITAS · SALSAS · 3X2 · TACNA · ALITAS · SALSAS · 3X2 · TACNA ·</span>
            <span>ALITAS · SALSAS · 3X2 · TACNA · ALITAS · SALSAS · 3X2 · TACNA ·</span>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <img src={LOGO} alt="" className="h-11 w-11 rounded-full border-2 border-ambar object-cover" />
          <span className="text-[13px] font-extrabold tracking-[3px] text-ambar-claro">ALA MI BRO · CENTRO DE MANDO</span>
        </div>

        <div className="relative flex flex-wrap items-center gap-10 py-8 max-md:py-0">
          <div className="relative h-[300px] w-[300px] flex-none max-md:hidden">
            <div className="absolute inset-[8%] rounded-full bg-rojo" />
            <div className="adm-spin absolute inset-0 rounded-full border-[3px] border-dashed border-ambar" />
            <img
              src={LOGO}
              alt="Logo Ala Mi Bro"
              className="adm-float absolute inset-[14%] h-[72%] w-[72%] rounded-full border-[6px] border-fondo object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)]"
            />
            <div className="adm-bob absolute top-[2%] -right-[34%] flex items-center gap-2.5 rounded-[14px] bg-crema px-3.5 py-2.5 text-fondo shadow-[0_14px_30px_-12px_rgba(0,0,0,.8)]">
              <span className="adm-live h-2.5 w-2.5 rounded-full bg-verde" />
              <span className="text-[13px] font-extrabold">Pedidos en vivo</span>
            </div>
            <div
              className="adm-bob absolute bottom-[4%] -right-[28%] rounded-[14px] bg-ambar px-3.5 py-2.5 text-[13px] font-extrabold text-fondo shadow-[0_14px_30px_-12px_rgba(0,0,0,.8)]"
              style={{ animationDelay: "-2s" }}
            >
              {promoHoy ? "3x2 activo hoy" : "3x2 · L, J y D"}
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
            <h1 className="m-0 font-titulo text-[clamp(44px,5vw,72px)] leading-[.95] font-normal">
              El panel de <span className="text-ambar">los</span> <span className="text-rojo-vivo">bros</span>
            </h1>
            <p className="m-0 max-w-[420px] text-lg leading-[1.55] text-crema-3">
              Pedidos de la web y WhatsApp, caja, carta, promos y clientes. Todo Ala Mi Bro en un solo lugar.
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-3 text-sm text-texto-2-osc max-md:hidden">
          {["Av. San Martín 1115 – Tacna", "5:00 PM – 11:30 PM", "Hecho en Tacna"].map((t) => (
            <span key={t} className="rounded-full border border-oscuro-borde-2 px-3.5 py-2">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-[1_1_440px] items-center justify-center rounded-l-[36px] bg-papel-2 px-6 py-10 max-md:rounded-none">
        <form onSubmit={entrar} className="adm-in flex w-[min(440px,100%)] flex-col gap-5" noValidate>
          <div>
            <p className="m-0 mb-2 text-[13px] font-extrabold tracking-[2px] text-rojo-texto uppercase">{saludo}</p>
            <h2 className="m-0 font-titulo text-[46px] leading-none font-normal text-tinta">¿Listo para el turno, bro?</h2>
            <p className="mt-2.5 mb-0 text-base leading-normal text-tinta-2">
              {DEMO ? "Elige tu rol e ingresa. Verás solo lo que necesitas para tu trabajo." : "Ingresa con tu correo. Verás solo lo que tu rol necesita."}
            </p>
          </div>

          {DEMO ? (
            <div role="radiogroup" aria-label="Rol" className="grid grid-cols-3 gap-2.5">
              {(Object.keys(ROLES) as Rol[]).map((k) => {
                const on = rol === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRol(k)}
                    className="adm-btn flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 px-2 py-3 text-sm font-bold"
                    style={{
                      background: on ? "#16100D" : "#FFFFFF",
                      color: on ? "#FFF4E2" : "#1E1410",
                      borderColor: on ? "#E11D1F" : "#E6D9C6",
                      boxShadow: on ? "0 14px 28px -16px rgba(225,29,31,.8)" : "none",
                    }}
                  >
                    <span className="font-titulo text-[26px] leading-none">{ROLES[k].initial}</span>
                    <span>{ROLES[k].label}</span>
                    <span className="text-[11px] font-semibold opacity-85">{ROLES[k].hint}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="adm-user" className="text-sm font-extrabold">
              {DEMO ? "Usuario" : "Correo"}
            </label>
            <input
              id="adm-user"
              className="adm-input min-h-[54px] rounded-[14px] border-2 bg-white px-4 text-base font-medium text-tinta"
              style={{ borderColor: userMal ? "#E11D1F" : "#E6D9C6" }}
              autoComplete={DEMO ? "username" : "email"}
              type={DEMO ? "text" : "email"}
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setError("");
              }}
              placeholder={DEMO ? "Ej. milton" : "tu@correo.com"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="adm-pass" className="text-sm font-extrabold">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="adm-pass"
                className="adm-input min-h-[54px] w-full rounded-[14px] border-2 bg-white pr-[92px] pl-4 text-base font-medium text-tinta"
                style={{ borderColor: passMal ? "#E11D1F" : "#E6D9C6" }}
                type={ver ? "text" : "password"}
                autoComplete="current-password"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError("");
                }}
                placeholder="Tu contraseña"
              />
              <button
                type="button"
                onClick={() => setVer(!ver)}
                aria-label="Mostrar u ocultar contraseña"
                className="adm-btn absolute top-1.5 right-1.5 h-[42px] rounded-[10px] border-0 bg-papel-4 px-3.5 text-[13px] font-bold text-tinta-2"
              >
                {ver ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {error ? (
            <div key={intento} role="alert" className="adm-shake rounded-xl bg-[#FDE7E7] px-3.5 py-3 text-sm font-bold text-rojo-sombra">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={cargando}
            className="adm-btn adm-shine flex min-h-[58px] items-center justify-between rounded-2xl border-0 bg-rojo px-[22px] text-[17px] font-extrabold text-white shadow-[0_8px_0_#8E0F10] disabled:!opacity-100"
          >
            <span>{cargando ? "Entrando…" : DEMO ? "Entrar como " + ROLES[rol].label : "Entrar"}</span>
            {cargando ? (
              <span className="adm-spin h-[22px] w-[22px] rounded-full border-[3px] border-white/35 border-t-white" style={{ animationDuration: ".8s" }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            )}
          </button>
          <p className="m-0 text-center text-[13px] text-tinta-3">
            {DEMO
              ? "Modo demo: cualquier usuario (3+ letras) y contraseña (4+ caracteres)."
              : "¿Olvidaste tu contraseña? Pídele al administrador que la restablezca."}
          </p>
        </form>
      </section>
    </main>
  );
}
