export const money = (n: number) => "S/ " + Number(n || 0).toFixed(2);
export const moneyK = (n: number) => "S/ " + Math.round(n || 0).toLocaleString("es-PE");

export const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const primerNombre = (nombre: string) => (nombre || "").trim().split(" ")[0] || "";

export const minutosDesde = (t: number, ahora = Date.now()) => Math.max(0, Math.round((ahora - t) / 60000));

export const DIA_MS = 86_400_000;

export function haceDias(t: number | null, ahora = Date.now()) {
  if (!t) return "—";
  const d = Math.floor((inicioDia(ahora) - inicioDia(t)) / DIA_MS);
  if (d <= 0) return "Hoy";
  if (d === 1) return "Ayer";
  return "Hace " + d + " días";
}

/** Medianoche (hora local del navegador; el equipo está en Tacna). */
export function inicioDia(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function fechaCorta(t: number, ahora = Date.now()) {
  const d = new Date(t);
  const hora = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dias = Math.floor((inicioDia(ahora) - inicioDia(t)) / DIA_MS);
  if (dias === 0) return "hoy " + hora;
  if (dias === 1) return "ayer " + hora;
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" }).replace(".", "") + " " + hora;
}

/** Deja solo dígitos y antepone 51 a celulares peruanos de 9 dígitos (igual que la BD). */
export function normalizarTelefono(t: string) {
  const d = (t || "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(d)) return "51" + d;
  return d;
}

export const enlaceWa = (telefono: string, texto: string) =>
  "https://wa.me/" + (normalizarTelefono(telefono) || "") + "?text=" + encodeURIComponent(texto);

/** Copia de un objeto sin una clave. */
export function sinClave<T extends Record<string, unknown>>(o: T, k: string): T {
  const c = { ...o };
  delete c[k];
  return c;
}
