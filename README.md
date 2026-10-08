# Ala Mi Bro — Panel de administración

Producto 2 de la arquitectura: el centro de mando del equipo (admin, caja y cocina).
**React + Vite (SPA)**, publicado como **Static Site en Render** (`admin.alamibro.pe`).
El backend compartido con la web de pedidos vive en `supabase/` (migraciones, RLS, Edge Functions).

## Dos modos de datos

| Modo | Cuándo | Qué pasa |
|---|---|---|
| **Demo** | Sin `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Datos de ejemplo en el navegador (8 semanas de historial + pedidos en vivo). Login: cualquier usuario (3+ letras) y contraseña (4+), eligiendo el rol. Se sincroniza entre pestañas. |
| **Supabase** | Con las variables | Login real (correo + contraseña), rol desde la tabla `perfiles`, permisos por RLS, pedidos de la landing en vivo (Realtime) con sonido, fotos en Storage. |

La interfaz no cambia entre modos: ambos implementan la misma interfaz `Api` (`src/lib/api/`).

## Pantallas y roles

| Pantalla | Admin | Caja | Cocina |
|---|:-:|:-:|:-:|
| Inicio (KPIs, ventas por hora/día/semana, canales, top productos, salsas, alertas) | ✓ | | |
| Pedidos en vivo (kanban, cronómetros, pago, avisar por WhatsApp, pegar pedido, encuesta) | ✓ | ✓ | ✓ (solo avanza estados) |
| Caja (venta en local; entra a cocina y descuenta stock; vuelto) | ✓ | ✓ | |
| Carta y stock (precios, stock, disponibilidad, salsas, agregados, fotos) | ✓ | | |
| Promos y cupones | ✓ | | |
| Clientes (segmentos y campañas por WhatsApp) | ✓ | ✓ | |
| Reseñas y encuesta | ✓ | | |
| Reportes (CSV) | ✓ | | |
| Ajustes (tienda abierta/cerrada, horario, Yape/Plin, zonas) | ✓ | | |

Reglas clave (iguales en el panel y en la base de datos):

- Estados: `nuevo → cocina → listo → (delivery: camino →) entregado`; además `cancelado` y `sin_respuesta` (web > 30 min sin confirmar).
- Aceptar un pedido (pasar a cocina) descuenta stock; cancelarlo lo devuelve. Cocina no puede aceptar ni cancelar.
- Atrasado: > 25 min (parpadea); ámbar desde 15 min. Stock bajo: ≤ 5.
- Segmentos: Inactivo (> 30 días) > VIP (≥ 8 pedidos) > Frecuente (≥ 3) > Nuevo.
- “Tienda cerrada” bloquea los pedidos de la landing (lo valida la Edge Function `crear-pedido`).
- “Pegar pedido de WhatsApp” entiende el formato de `docs/formato-mensaje-whatsapp.md` y no duplica pedidos que ya llegaron con código.

## Desarrollo

```bash
npm ci
npm run dev              # http://localhost:5173 (modo demo)
npm run check            # tipos + lint + Vitest
npm run build            # dist/
npm run test:e2e         # Playwright contra el build (npx playwright install chromium la 1.ª vez)
```

Para usar Supabase en local: copia `.env.example` a `.env.local` y completa las variables.

## Estructura

```
src/
  lib/
    tipos.ts           modelo de dominio
    reglas.ts          flujo de estados, parser de WhatsApp, segmentos, resúmenes, CSV
    api/               demo.ts (navegador) · supabase.ts (real) · demo-seed.ts
    catalogo.ts        carta compartida (src/data/catalogo.json = misma fuente que el seed)
  hooks/               sesión, toasts, TanStack Query + tiempo real
  components/          Layout (menú por rol), UI, gráficos (Recharts)
  pages/               una por pantalla
supabase/              migraciones, seed, Edge Functions → ver docs/backend.md
tests/unit, tests/e2e
```

## Despliegue en Render

**New → Static Site** (o **Blueprint** con `render.yaml`):

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- **Rewrite**: `/*` → `/index.html`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LANDING_URL`
- Dominio: `admin.alamibro.pe`

La seguridad no depende de esconder la URL: la garantizan Supabase Auth y las políticas RLS.
El backend se instala siguiendo **`docs/backend.md`** (crear proyecto, `supabase db push`, seed, funciones, primer admin).
