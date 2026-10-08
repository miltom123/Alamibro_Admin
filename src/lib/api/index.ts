import { demoApi } from "./demo";
import { crearSupabaseApi } from "./supabase";
import type { Api } from "./tipo";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Con las variables de Supabase → datos reales. Sin ellas → modo demo en el navegador. */
export const api: Api = url && key ? crearSupabaseApi(url, key) : demoApi;

export type { Api, EventoDatos } from "./tipo";
