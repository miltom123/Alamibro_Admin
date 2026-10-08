import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useUsuario } from "@/hooks/auth";
import { useAjustes, useGuardarAjustes, usePedidos, useProductos, useTiempoReal } from "@/hooks/datos";
import { useToast } from "@/hooks/toast";
import { api } from "@/lib/api";
import ErrorPantalla from "./ErrorPantalla";
import { DIAS_PROMO_3X2, LANDING_URL, NAV, PANTALLAS, ROLES, STOCK_BAJO, puedeVer } from "@/lib/config";
import { iniciales } from "@/lib/formato";
import type { Pantalla } from "@/lib/tipos";

const LOGO = "/img/logo-alamibro.webp";

export default function Layout() {
  const usuario = useUsuario();
  const { logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const pantalla = (pathname.split("/")[1] || "inicio") as Pantalla;
  const info = PANTALLAS[pantalla] ?? PANTALLAS.inicio;
  const rol = ROLES[usuario.rol];
  useTiempoReal();

  const { data: pedidos = [] } = usePedidos();
  const { data: productos = [] } = useProductos();
  const { data: ajustes } = useAjustes();
  const guardar = useGuardarAjustes();
  const flash = useToast();

  const nuevos = pedidos.filter((o) => o.estado === "nuevo").length;
  const stockBajo = productos.filter((p) => p.disponible && p.stock <= STOCK_BAJO).length;
  const diaPromo = DIAS_PROMO_3X2.includes(new Date().getDay());
  const abierta = ajustes?.tiendaAbierta ?? true;
  const esAdmin = usuario.rol === "admin";

  const alternarTienda = () => {
    if (!esAdmin) return;
    guardar.mutate({ tiendaAbierta: !abierta });
    flash(abierta ? "Tienda cerrada: la landing no recibe pedidos" : "Tienda abierta");
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-papel">
      {/* SIDEBAR */}
      <aside className="adm-side adm-scroll flex max-w-full flex-[1_1_250px] flex-col overflow-y-auto bg-fondo text-crema-2">
        <div className="adm-brand flex items-center gap-3 border-b border-oscuro-borde px-[18px] py-5">
          <img src={LOGO} alt="" className="h-[46px] w-[46px] rounded-full border-2 border-ambar object-cover" />
          <div>
            <div className="font-titulo text-[22px] leading-none text-crema">
              ALA MI <span className="text-rojo-vivo">BRO</span>
            </div>
            <div className="mt-[3px] text-xs text-texto-3-osc">Centro de mando · {rol.label}</div>
          </div>
        </div>
        <nav aria-label="Secciones" className="adm-sidenav flex flex-1 flex-col gap-1 px-3 py-3.5">
          {NAV.map((g) => {
            const items = g.items.filter((id) => puedeVer(usuario.rol, id));
            if (!items.length) return null;
            return (
              <div key={g.title} className="adm-navgroup mb-2.5 flex flex-col gap-1">
                <div className="adm-navtitle px-2.5 pt-2 pb-1 text-[11px] font-extrabold tracking-[1.5px] text-[#8F7C6A]">{g.title}</div>
                {items.map((id) => {
                  let badge = "";
                  let tono: "rojo" | "ambar" = "rojo";
                  if (id === "pedidos" && nuevos) badge = String(nuevos);
                  if (id === "carta" && stockBajo) {
                    badge = String(stockBajo);
                    tono = "ambar";
                  }
                  if (id === "promos" && diaPromo) {
                    badge = "3x2 hoy";
                    tono = "ambar";
                  }
                  return (
                    <NavLink
                      key={id}
                      to={"/" + id}
                      className="adm-nav flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold no-underline"
                      style={({ isActive }) => ({
                        background: isActive ? "#E11D1F" : "transparent",
                        color: isActive ? "#FFFFFF" : "#E9D9C6",
                        boxShadow: isActive ? "0 10px 22px -12px rgba(225,29,31,.9)" : "none",
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] font-titulo text-[15px]"
                            style={{ background: isActive ? "rgba(255,255,255,.18)" : "#2A1E18" }}
                            aria-hidden
                          >
                            {PANTALLAS[id].glyph}
                          </span>
                          <span className="flex-1">{PANTALLAS[id].label}</span>
                          {badge ? (
                            <span
                              className="grid h-[22px] min-w-[22px] place-items-center rounded-full px-[7px] text-xs font-extrabold"
                              style={
                                tono === "ambar"
                                  ? { background: "#FFB21A", color: "#16100D" }
                                  : { background: isActive ? "#FFFFFF" : "#E11D1F", color: isActive ? "#B5121B" : "#FFFFFF" }
                              }
                            >
                              {badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="adm-userbar flex items-center gap-3 border-t border-oscuro-borde p-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-rojo font-extrabold text-white">{iniciales(usuario.nombre)}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-crema">{usuario.nombre}</div>
            <div className="text-xs text-texto-3-osc">{rol.label}</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              nav("/login");
            }}
            aria-label="Cerrar sesión"
            className="adm-btn grid h-11 w-11 place-items-center rounded-xl border border-oscuro-borde-2 bg-transparent text-crema-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 4h4v16h-4" />
              <path d="M10 8l-4 4 4 4" />
              <path d="M6 12h10" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex min-w-0 flex-[999_1_640px] flex-col">
        <header className="adm-header sticky top-0 z-20 border-b border-[#E6D9C6] bg-[rgba(246,240,230,.92)] backdrop-blur-[8px]">
          <div className="flex flex-wrap items-center gap-3.5 px-[clamp(16px,3vw,32px)] py-3.5">
            <div className="min-w-0 flex-[1_1_280px]">
              <h1 className="m-0 font-titulo text-[30px] leading-[1.05] font-normal">{info.title}</h1>
              <p className="mt-[3px] mb-0 text-sm text-tinta-2">{info.sub}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {api.modo === "demo" ? (
                <span className="rounded-full bg-papel-3 px-3 py-[7px] text-xs font-bold text-tinta-2" title="Sin Supabase configurado: los datos viven en este navegador">
                  Datos de ejemplo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-verde-claro px-3 py-[7px] text-xs font-bold text-verde-osc">
                  <span className="adm-live h-2 w-2 rounded-full bg-verde" /> En vivo
                </span>
              )}
              <button
                type="button"
                onClick={alternarTienda}
                disabled={!esAdmin}
                title={esAdmin ? "Abrir o cerrar la tienda" : "Solo el administrador puede cambiarlo"}
                className="adm-btn flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold disabled:!opacity-100"
                style={{
                  borderColor: abierta ? "#BFE5CC" : "#E6D9C6",
                  background: abierta ? "#EAF7EF" : "#F3E9DB",
                  color: abierta ? "#1F7A4A" : "#5E4E42",
                }}
              >
                <span className={"h-[9px] w-[9px] rounded-full " + (abierta ? "adm-live" : "")} style={{ background: abierta ? "#1F9D55" : "#8F7C6A" }} />
                {abierta ? "Tienda abierta" : "Tienda cerrada"}
              </button>
              <a
                href={LANDING_URL}
                target="_blank"
                rel="noopener"
                className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#E9B44C] bg-[#FFF8EA] px-3.5 text-[13px] font-bold !text-[#8A5300] no-underline"
              >
                Ver landing
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
              {puedeVer(usuario.rol, "caja") && pantalla !== "caja" ? (
                <button
                  type="button"
                  onClick={() => nav("/caja")}
                  className="adm-btn adm-shine min-h-10 rounded-full border-0 bg-rojo px-4 text-[13px] font-extrabold text-white"
                >
                  + Nuevo pedido
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <main className="flex flex-col gap-[22px] px-[clamp(16px,3vw,32px)] pt-6 pb-12">
          <ErrorPantalla clave={pantalla}>
            <Outlet />
          </ErrorPantalla>
        </main>
      </div>
    </div>
  );
}
