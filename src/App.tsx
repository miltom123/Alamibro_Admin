import type { ReactElement } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./hooks/auth";
import { ROLES, puedeVer } from "./lib/config";
import type { Pantalla } from "./lib/tipos";
import Layout from "./components/Layout";
import { Cargando } from "./components/ui";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Pedidos from "./pages/Pedidos";
import Caja from "./pages/Caja";
import Carta from "./pages/Carta";
import Promos from "./pages/Promos";
import Clientes from "./pages/Clientes";
import Resenas from "./pages/Resenas";
import Reportes from "./pages/Reportes";
import Ajustes from "./pages/Ajustes";

const PAGINAS: Record<Pantalla, () => ReactElement> = {
  inicio: Inicio,
  pedidos: Pedidos,
  caja: Caja,
  carta: Carta,
  promos: Promos,
  clientes: Clientes,
  resenas: Resenas,
  reportes: Reportes,
  ajustes: Ajustes,
};

/** Muestra la pantalla solo si el rol la tiene; si no, lleva a la primera permitida. */
function Pagina() {
  const { usuario } = useAuth();
  const { pantalla } = useParams();
  const p = pantalla as Pantalla;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!PAGINAS[p] || !puedeVer(usuario.rol, p)) return <Navigate to={"/" + ROLES[usuario.rol].screens[0]} replace />;
  const C = PAGINAS[p];
  return <C />;
}

function Protegido() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando texto="Abriendo el panel…" />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout />;
}

function Inicial() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  return <Navigate to={usuario ? "/" + ROLES[usuario.rol].screens[0] : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protegido />}>
        <Route path="/:pantalla" element={<Pagina />} />
      </Route>
      <Route path="*" element={<Inicial />} />
    </Routes>
  );
}
