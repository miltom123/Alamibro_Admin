import { money, moneyK } from "./formato";
import type { Rango, Resumen } from "./reglas";

export const RANGOS: { id: Rango; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

export function kpisDe(r: Resumen) {
  const totalCanales = r.canales.web + r.canales.recojo + r.canales.salon || 1;
  return [
    { label: "Ventas", value: moneyK(r.ventas), note: r.deltaVentas, accent: "#E11D1F", chip: r.deltaPositivo ? ["#EAF7EF", "#1F7A4A"] : ["#FDE7E7", "#8E0F10"] },
    { label: "Pedidos", value: String(r.pedidos), note: r.recurrentes + " de clientes que vuelven", accent: "#2A6FDB", chip: ["#EEF3FD", "#1D4FA8"] },
    { label: "Ticket promedio", value: money(r.ticket), note: r.deltaTicket, accent: "#D68A00", chip: ["#EAF7EF", "#1F7A4A"] },
    { label: "Por web / WhatsApp", value: Math.round((r.canales.web / totalCanales) * 100) + "%", note: r.canales.web + " pedidos desde la landing", accent: "#1F9D55", chip: ["#FFF4E2", "#7A4A00"] },
  ];
}

