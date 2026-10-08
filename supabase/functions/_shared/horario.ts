/**
 * Horario de atención y días de promo, siempre en hora de Perú (America/Lima).
 * Port de alamibro-web/lib/reglas/horario.ts; aquí la apertura y el cierre son
 * configurables (vienen de ajustes_tienda). TypeScript puro.
 */

export const ZONA = "America/Lima";
export const ABRE_MIN = 17 * 60; // 5:00 PM
export const CIERRA_MIN = 23 * 60 + 30; // 11:30 PM

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface HoraLima {
  /** 0 = domingo … 6 = sábado */
  dow: number;
  /** minutos desde la medianoche */
  mins: number;
}

export function horaLima(fecha: Date = new Date()): HoraLima {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "0";
  return { dow: DIAS[get("weekday")] ?? 0, mins: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** "17:00" o "17:00:00" (columna time de Postgres) → minutos desde la medianoche. */
export function aMinutos(hora: string | null | undefined, porDefecto: number): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : porDefecto;
}

/** Abierto entre `abre` y `cierra` (ambos inclusive). Si cierra < abre, el horario cruza la medianoche. */
export function estaAbierto(h: HoraLima, abre = ABRE_MIN, cierra = CIERRA_MIN): boolean {
  if (abre <= cierra) return h.mins >= abre && h.mins <= cierra;
  return h.mins >= abre || h.mins <= cierra;
}

export const esDiaPromo = (h: HoraLima, dias: number[]) => dias.includes(h.dow);

/** 1050 → "5:30 p. m." */
export function horaLegible(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}
