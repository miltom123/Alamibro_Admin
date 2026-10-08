import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Rol, Usuario } from "@/lib/tipos";

interface Ctx {
  usuario: Usuario | null;
  cargando: boolean;
  login: (p: { usuario: string; password: string; rol: Rol }) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .sesion()
      .then(setUsuario)
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (p: { usuario: string; password: string; rol: Rol }) => {
    const u = await api.login(p);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUsuario(null);
  }, []);

  return <AuthCtx.Provider value={{ usuario, cargando, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}

/** Usuario con sesión (solo dentro de rutas protegidas). */
export function useUsuario(): Usuario {
  const { usuario } = useAuth();
  if (!usuario) throw new Error("Sin sesión");
  return usuario;
}
