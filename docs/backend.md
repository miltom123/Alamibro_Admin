# Backend de Ala Mi Bro (Supabase)

Supabase es el único backend: Postgres + RLS + Edge Functions + Realtime + Storage + Auth.
La landing (Next.js estático, `alamibro-web`) y este panel (React, `alamibro-admin`) se publican
como sitios estáticos en Render; **toda la lógica de servidor vive aquí**.

```
supabase/
├── config.toml                         # verify_jwt = false en las 3 funciones públicas
├── migrations/
│   ├── 20261008000001_esquema.sql      # tablas, secuencia AMB-#####, triggers, vistas
│   ├── 20261008000002_seguridad.sql    # rol_actual(), transiciones, guardia de cocina, RLS
│   ├── 20261008000003_rpc.sql          # cambiar_estado_pedido, registrar_venta_caja, ajustar_stock…
│   └── 20261008000004_realtime_storage.sql  # Realtime, bucket "productos", pg_cron
├── seed.sql                            # GENERADO por scripts/generar-seed.mjs
└── functions/
    ├── _shared/                        # reglas puras (precios, horario, cupones…) + utilidades
    ├── crear-pedido/                   # pedidos de la landing
    ├── validar-cupon/
    └── encuesta/
scripts/
├── generar-seed.mjs                    # src/data/catalogo.json → supabase/seed.sql
└── probar-sql.mjs                      # prueba migraciones + seed + RPC en PGlite
```

## 1. Crear y enlazar el proyecto

1. Crea un proyecto en <https://supabase.com/dashboard> (región **São Paulo** es la más cercana a Tacna).
2. Instala la CLI (`npm i -g supabase` o `brew install supabase/tap/supabase`) y enlaza:

```bash
cd alamibro-admin
supabase login
supabase link --project-ref <REF_DEL_PROYECTO>
```

## 2. Migraciones y datos iniciales

```bash
node scripts/generar-seed.mjs        # regenera supabase/seed.sql desde src/data/catalogo.json
supabase db push --include-seed      # aplica migraciones + seed.sql
```

También puedes pegar `supabase/seed.sql` en el **SQL Editor** o ejecutarlo con
`psql "$DATABASE_URL" -f supabase/seed.sql`. El seed es idempotente: actualiza nombres, precios y
opciones de la carta, pero **no** pisa el stock, la disponibilidad ni los ajustes de la tienda.
Las promos y zonas solo se insertan si no existen (por nombre).

> Si cambias la carta en `src/data/catalogo.json`, vuelve a generar el seed y ejecútalo.
> Los precios editados desde el panel se sobrescriben al volver a correr el seed.

## 3. Edge Functions

```bash
supabase functions deploy crear-pedido
supabase functions deploy validar-cupon
supabase functions deploy encuesta
```

`config.toml` ya las marca con `verify_jwt = false` (validan la autorización por su cuenta).
Si despliegas sin ese archivo, agrega `--no-verify-jwt`.

### Secretos

```bash
supabase secrets set \
  IP_SALT="$(openssl rand -hex 16)" \
  PUBLIC_SITE_URL="https://alamibro.pe" \
  TURNSTILE_SECRET="0x4AAAA…"          # opcional
```

| Secreto | Uso |
|---|---|
| `IP_SALT` | Sal del hash de IP (límite de 3 pedidos web por minuto por IP). No se guarda la IP. |
| `PUBLIC_SITE_URL` | Base del enlace de la encuesta: `<url>/encuesta?t=<token>`. Por defecto `https://alamibro.pe`. |
| `TURNSTILE_SECRET` | Si existe, `crear-pedido` **exige** `turnstileToken` (Cloudflare Turnstile). |
| `IGNORAR_HORARIO` | `1` para aceptar pedidos fuera de horario (solo pruebas). |
| `CUPON_ENCUESTA` | Cupón que se regala al responder la encuesta. Por defecto `GRACIASBRO`. |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.

### Contratos

**`crear-pedido`** (POST, sin sesión)

```jsonc
// entrada (lo que envía alamibro-web/lib/pedidos.ts, más campos opcionales)
{ "cliente": { "name": "Valeria", "mode": "delivery", "address": "Calle Zela 715", "pay": "Plin" },
  "items": [{ "id": "clasicas", "size": "12", "choices": { "salsas": ["bbq"], "acomp": "papas" }, "qty": 1, "note": "" }],
  "telefono": "960394794", "cupon": "GRACIASBRO", "turnstileToken": "…", "zonaId": "<uuid>" }
// 200
{ "codigo": "AMB-00042", "total": 29, "subtotal": 32, "descuento": 3, "promo3x2": false }
// error (400 validación · 403 Turnstile · 409 tienda cerrada/fuera de horario · 422 carta/stock/cupón · 429 límite · 500)
{ "error": "Alitas Clásicas: Elige tu acompañamiento" }
```

Recalcula cada línea con la carta de la BD (nunca confía en el cliente): presentación + extras
single/multi + (precio × cantidad) de opciones qty, todo × cantidad. Valida grupos obligatorios,
máximo de salsas por presentación (6→1, 12→2, 18→3), salsas no disponibles, `productos.disponible`,
stock (`stock <= 0` → agotado; no se puede pedir más que el stock), `ajustes_tienda.tienda_abierta`
y el horario `abre`–`cierra` en hora de Lima. Guarda el pedido en estado `nuevo`, canal `web`, con
`detalle` igual al de la landing unido con `" · "`. El 3x2 **no** se descuenta del total (es el
"total referencial" del mensaje de WhatsApp); si aplica, el pedido lleva la nota
"Aplicar promo 3x2 en alitas" y la respuesta `promo3x2: true`.

**`validar-cupon`** (POST) `{ codigo, subtotal?, telefono? }` →
`{ valido, mensaje, descuento, promo?: { nombre, tipo, valor } }`. Revisa activa, día y hora de Lima,
mínimo (si se envía `subtotal`) y límite de usos. Solo los tipos `porc` y `monto` funcionan como cupón.

**`encuesta`**

| Llamada | Respuesta |
|---|---|
| `POST { accion: "crear", pedidoId }` con `Authorization: Bearer <JWT admin/caja>` (desde el panel: `supabase.functions.invoke("encuesta", { body })` ya envía el JWT) | `{ token, url }` (idempotente por pedido) |
| `GET ?t=<token>` | `{ codigo, preguntas: [{id,label,activa}], respondida }` |
| `POST { accion: "responder", token, estrellas, origen?, mejorar?, comentario? }` | `{ invitarGoogle: estrellas >= 4, cupon: "GRACIASBRO" \| null }` — una sola vez (409 si ya se respondió) |

## 4. Primer usuario admin

1. Dashboard → **Authentication → Users → Add user** (correo + contraseña, "Auto confirm").
2. SQL Editor:

```sql
insert into public.perfiles (id, nombre, rol)
select id, 'Dueño', 'admin' from auth.users where email = 'dueno@alamibro.pe'
on conflict (id) do update set rol = 'admin';
```

Para caja o cocina, crea el usuario igual y usa `rol = 'caja'` o `'cocina'`. Un usuario sin fila
en `perfiles` no ve nada (RLS).

## 5. Roles y seguridad

| Rol | Puede |
|---|---|
| anon (landing) | Leer `categorias`, `productos`, `presentaciones`, `grupos_opciones`, `opciones`, `salsas`, `zonas_delivery`, `ajustes_tienda` y `promos` activas **sin** cupón. Nada más: los pedidos entran solo por `crear-pedido`. |
| admin | Todo. |
| caja | Ver/crear/editar `pedidos`, `pedido_items`, `clientes`; leer carta, agregados, ajustes, zonas, promos (incluye cupones) y `cupon_usos`. Stock solo con `ajustar_stock`. |
| cocina | Ver `pedidos` e ítems y cambiar **solo** `estado` (el trigger `pedidos_10_guardia` rechaza cualquier otra columna). |

### Estados del pedido

```
nuevo ─┬─► cocina ─► listo ─┬─► camino ─► entregado     (delivery)
       │                    └─► entregado               (recojo / salón)
       ├─► sin_respuesta ─► cocina
       └─► cancelado        (cualquier estado no final → cancelado: admin/caja)
```

- `nuevo → cocina`, `nuevo → sin_respuesta`, `sin_respuesta → cocina` y cancelar: solo admin/caja.
- `cocina → listo`, `listo → camino/entregado`, `camino → entregado`: también cocina.
- `entregado` y `cancelado` son finales. La regla vive en `public.transicion_permitida()` y se aplica
  tanto en la RPC como en cualquier `UPDATE` directo hecho desde el panel.
- Al pasar a `cocina` se descuenta el stock (una sola vez, `stock_descontado`); al cancelar se repone.
- `confirmado_en` se llena al pasar a cocina; `entregado_en` al entregar; `actualizado_en` siempre.
- Los pedidos web en `nuevo` por más de 30 min pasan a `sin_respuesta` con
  `public.marcar_sin_respuesta()` (pg_cron cada 5 min si la extensión está disponible; si no,
  el panel puede llamarla con `supabase.rpc("marcar_sin_respuesta")`).

### RPC

| Función | Quién | Devuelve |
|---|---|---|
| `cambiar_estado_pedido(p_id uuid, p_estado text)` | admin, caja, cocina | la fila `pedidos` actualizada |
| `registrar_venta_caja(p jsonb)` | admin, caja | `text` código `AMB-#####` (entra en `cocina`, descuenta stock; error si no hay stock) |
| `ajustar_stock(p_producto text, p_delta int)` | admin, caja | `int` nuevo stock (nunca < 0) |
| `marcar_sin_respuesta(p_minutos int default 30)` | admin, caja, sistema | `int` pedidos marcados |
| `rol_actual()` | todos | `text` rol o null |
| `insertar_pedido_web(...)` | solo service role (uso interno de `crear-pedido`) | |

`registrar_venta_caja` recibe el `NuevoPedido` del panel:
`{ cliente, telefono, modalidad, direccion, pago, pagado, nota, cupon?, descuento?, zonaId?, items: [{ productoId, presentacionId, nombre, detalle, qty, total, salsas }] }`.

### Clientes

Al insertar un pedido con teléfono se crea o reutiliza el cliente (teléfono normalizado: solo
dígitos, y `9xxxxxxxx` → `519xxxxxxxx`). La vista `clientes_resumen` (id, nombre, telefono, origen,
creado_en, pedidos, gastado, ultimo_pedido, salsa_favorita) no cuenta pedidos `cancelado` ni
`sin_respuesta`. La vista `resenas` une respuestas, encuestas y pedidos. Ambas son
`security_invoker`, así que respetan RLS.

## 6. Realtime y Storage

- **Realtime**: `pedidos` y `pedido_items` se agregan a la publicación `supabase_realtime`
  (`pedidos` con `replica identity full`). El panel puede suscribirse con
  `supabase.channel("pedidos").on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, …)`;
  cada usuario solo recibe las filas que RLS le deja ver.
- **Storage**: bucket público `productos` (lectura para todos, subir/editar/borrar solo admin).
  URL pública: `<SUPABASE_URL>/storage/v1/object/public/productos/<archivo>`. Guarda esa URL (o la
  ruta `/img/…` de la landing) en `productos.imagen`.

## 7. Variables de entorno de los frontends

**Landing (`alamibro-web`, Render)**

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (Settings → API) |
| `NEXT_PUBLIC_STORE_WHATSAPP` | `51960394794` |
| `NEXT_PUBLIC_SITE_URL` | `https://alamibro.pe` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | solo si configuras `TURNSTILE_SECRET` |

**Panel admin (`alamibro-admin`, Render)**

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key |

Nunca pongas la service role key en ningún frontend.

## 8. Pruebas

```bash
# Reglas del servidor (precios, horario, cupones, validación) con Vitest
npx vitest run tests/unit/backend-precios.test.ts

# Migraciones + seed + RLS + RPC en Postgres embebido (PGlite, fuera del proyecto)
mkdir -p /tmp/pglite && (cd /tmp/pglite && npm init -y && npm i @electric-sql/pglite)
PGLITE_DIR=/tmp/pglite node scripts/probar-sql.mjs

# Tipos de las Edge Functions
cd supabase/functions && npx --yes deno@2 check crear-pedido/index.ts validar-cupon/index.ts encuesta/index.ts
```

Para probar las funciones localmente: `supabase start` y
`supabase functions serve --env-file supabase/.env.local` (con `IGNORAR_HORARIO=1` si estás fuera de horario).
