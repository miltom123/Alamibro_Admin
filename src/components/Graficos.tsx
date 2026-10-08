import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { moneyK } from "@/lib/formato";
import type { Resumen } from "@/lib/reglas";

/** Colores de gráficos (data/marca.json → graficos_categorias), validados para daltonismo. */
export const COLOR_CANAL = { web: "#D11A1E", recojo: "#D68A00", salon: "#2A6FDB" } as const;

function TooltipVentas({ active, payload }: { active?: boolean; payload?: { payload: { detalle: string; valor: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-[10px] bg-fondo px-3 py-2 text-center text-[13px] font-bold text-crema shadow-lg">
      {d.detalle}
      <br />
      <span className="tabular text-[15px] text-ambar">{moneyK(d.valor)}</span>
    </div>
  );
}

/** Barras de ventas: un solo color, el pico resaltado y con su valor; el resto en el tooltip. */
export function BarrasVentas({ barras }: { barras: Resumen["barras"] }) {
  const max = Math.max(...barras.map((b) => b.valor), 0);
  const datos = barras.map((b) => ({ ...b, pico: b.valor === max && max > 0 }));
  return (
    <div className="h-[260px] w-full" role="img" aria-label={"Ventas: " + barras.map((b) => b.detalle + " " + moneyK(b.valor)).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 26, right: 4, left: 4, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke="#EFE4D3" strokeDasharray="4 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#E6D9C6", strokeWidth: 2 }} tick={{ fill: "#6B5A4C", fontSize: 12, fontWeight: 600 }} />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip content={<TooltipVentas />} cursor={{ fill: "rgba(225,29,31,.06)" }} />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive animationDuration={700}>
            {datos.map((d) => (
              <Cell key={d.label} fill={d.pico ? "#D11A1E" : "#E9787A"} />
            ))}
            <LabelList
              dataKey="valor"
              position="top"
              content={(p) => {
                const { x, y, width, index } = p as { x: number; y: number; width: number; index: number };
                if (!datos[index]?.pico) return null;
                return (
                  <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={800} fill="#1E1410" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {moneyK(datos[index].valor)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barra horizontal simple (top productos, salsas). */
export function BarraFila({ pct, color, delay = 0, alto = 8 }: { pct: number; color: string; delay?: number; alto?: number }) {
  return (
    <div className="flex-1 overflow-hidden rounded-full bg-papel-4" style={{ height: alto }}>
      <div className="adm-barx h-full rounded-full" style={{ width: Math.max(2, pct) + "%", background: color, animationDelay: delay + "s" }} />
    </div>
  );
}
