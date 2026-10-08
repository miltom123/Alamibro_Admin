-- =====================================================================
-- Ala Mi Bro · Esquema base
-- Tablas de carta, pedidos, clientes, promos, encuestas y ajustes.
-- Los nombres están en español y los usa el adaptador del panel admin
-- (src/lib/api/supabase.ts) y la Edge Function crear-pedido.
-- =====================================================================

-- gen_random_uuid() es nativo desde PostgreSQL 13: no se necesita pgcrypto.

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

-- Mantiene la columna actualizado_en al día.
create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- Normaliza un teléfono peruano: solo dígitos; 9 dígitos que empiezan con 9 → 51 + número.
create or replace function public.normalizar_telefono(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null then null
    when regexp_replace(p, '\D', '', 'g') = '' then null
    when regexp_replace(p, '\D', '', 'g') ~ '^9\d{8}$' then '51' || regexp_replace(p, '\D', '', 'g')
    else regexp_replace(p, '\D', '', 'g')
  end;
$$;

-- ---------------------------------------------------------------------
-- Carta
-- ---------------------------------------------------------------------

create table public.categorias (
  id     text primary key,
  label  text not null,
  orden  int  not null default 0
);

create table public.productos (
  id             text primary key,
  categoria_id   text not null references public.categorias (id) on update cascade,
  nombre         text not null,
  descripcion    text not null default '',
  badge          text,
  imagen         text,
  icono          text,
  tile           text,
  es_promo_3x2   boolean not null default false,
  disponible     boolean not null default true,
  stock          int     not null default 0,
  orden          int     not null default 0,
  actualizado_en timestamptz not null default now()
);
create index productos_categoria_idx on public.productos (categoria_id, orden);

create trigger productos_actualizado_en
  before update on public.productos
  for each row execute function public.tocar_actualizado_en();

create table public.presentaciones (
  id           uuid primary key default gen_random_uuid(),
  producto_id  text not null references public.productos (id) on delete cascade on update cascade,
  clave        text not null,
  etiqueta     text not null,
  precio       numeric(10,2) not null check (precio >= 0),
  unidades     int,
  tag          text,
  orden        int not null default 0,
  unique (producto_id, clave)
);

create table public.grupos_opciones (
  id                    uuid primary key default gen_random_uuid(),
  producto_id           text not null references public.productos (id) on delete cascade on update cascade,
  clave                 text not null,
  titulo                text not null,
  corto                 text not null default '',
  tipo                  text not null check (tipo in ('single', 'multi', 'qty')),
  obligatorio           boolean not null default false,
  min                   int,
  max                   int,
  max_por_presentacion  int[],
  aviso                 text,
  texto_cero            text,
  orden                 int not null default 0,
  unique (producto_id, clave)
);

create table public.opciones (
  id                  uuid primary key default gen_random_uuid(),
  grupo_id            uuid not null references public.grupos_opciones (id) on delete cascade,
  clave               text not null,
  etiqueta            text not null,
  precio_extra        numeric(10,2) not null default 0 check (precio_extra >= 0),
  imagen              text,
  etiqueta_destacada  text,
  orden               int not null default 0,
  unique (grupo_id, clave)
);

create table public.salsas (
  id          text primary key,
  nombre      text not null,
  tag         text,
  disponible  boolean not null default true,
  orden       int not null default 0
);

create table public.agregados (
  id          text primary key,
  nombre      text not null,
  precio      numeric(10,2) not null default 0 check (precio >= 0),
  disponible  boolean not null default true,
  orden       int not null default 0
);

create table public.zonas_delivery (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  costo   numeric(10,2) not null default 0 check (costo >= 0),
  orden   int not null default 0
);

-- ---------------------------------------------------------------------
-- Ajustes de la tienda (una sola fila, id = 1)
-- ---------------------------------------------------------------------

create table public.ajustes_tienda (
  id              int primary key default 1 check (id = 1),
  tienda_abierta  boolean not null default true,
  abre            time not null default '17:00',
  cierra          time not null default '23:30',
  whatsapp        text not null default '',
  yape            text not null default '',
  plin            text not null default '',
  direccion       text not null default '',
  encuesta        jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------
-- Perfiles del equipo (vinculados a auth.users)
-- ---------------------------------------------------------------------

create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  rol        text not null check (rol in ('admin', 'caja', 'cocina')),
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------

create table public.clientes (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null default '',
  telefono   text unique,
  origen     text not null default '',
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Promos y cupones
-- ---------------------------------------------------------------------

create table public.promos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  tipo           text not null check (tipo in ('porc', 'monto', '3x2', 'precio')),
  valor          numeric(10,2),
  dias           int[] not null default '{0,1,2,3,4,5,6}',
  desde          time not null default '00:00',
  hasta          time not null default '23:59',
  alcance        text not null default 'Toda la carta',
  codigo_cupon   text unique check (codigo_cupon is null or codigo_cupon = upper(codigo_cupon)),
  activa         boolean not null default true,
  minimo         numeric(10,2),
  limite_usos    int,
  creado_en      timestamptz not null default now()
);

-- Los cupones siempre se guardan en mayúsculas y sin espacios.
create or replace function public.normalizar_cupon()
returns trigger
language plpgsql
as $$
begin
  new.codigo_cupon := nullif(upper(btrim(new.codigo_cupon)), '');
  return new;
end;
$$;

create trigger promos_normalizar_cupon
  before insert or update of codigo_cupon on public.promos
  for each row execute function public.normalizar_cupon();

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------

create sequence public.pedidos_codigo_seq start 1;

create table public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique
                    default ('AMB-' || lpad(nextval('public.pedidos_codigo_seq')::text, 5, '0')),
  cliente_id        uuid references public.clientes (id) on delete set null,
  cliente_nombre    text not null default '',
  telefono          text,
  canal             text not null check (canal in ('web', 'caja')),
  modalidad         text not null check (modalidad in ('delivery', 'recojo', 'salon')),
  direccion         text not null default '',
  metodo_pago       text not null default 'Efectivo',
  pagado            boolean not null default false,
  estado            text not null default 'nuevo'
                    check (estado in ('nuevo', 'cocina', 'listo', 'camino', 'entregado', 'cancelado', 'sin_respuesta')),
  nota              text not null default '',
  cupon             text,
  descuento         numeric(10,2) not null default 0 check (descuento >= 0),
  subtotal          numeric(10,2) not null default 0 check (subtotal >= 0),
  total             numeric(10,2) not null default 0 check (total >= 0),
  zona_id           uuid references public.zonas_delivery (id) on delete set null,
  ip_hash           text,
  -- true cuando el stock de la carta ya se descontó por este pedido (se repone al cancelar).
  stock_descontado  boolean not null default false,
  creado_en         timestamptz not null default now(),
  confirmado_en     timestamptz,
  entregado_en      timestamptz,
  actualizado_en    timestamptz not null default now()
);
alter sequence public.pedidos_codigo_seq owned by public.pedidos.codigo;

create index pedidos_estado_idx on public.pedidos (estado, creado_en desc);
create index pedidos_creado_idx on public.pedidos (creado_en desc);
create index pedidos_cliente_idx on public.pedidos (cliente_id);
create index pedidos_ip_idx on public.pedidos (ip_hash, creado_en desc) where ip_hash is not null;

-- Realtime: enviar la fila anterior completa en los UPDATE.
alter table public.pedidos replica identity full;

create table public.pedido_items (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null references public.pedidos (id) on delete cascade,
  producto_id         text references public.productos (id) on delete set null on update cascade,
  presentacion_clave  text,
  nombre              text not null,
  detalle             text not null default '',
  cantidad            int  not null check (cantidad > 0),
  total               numeric(10,2) not null default 0 check (total >= 0),
  salsas              text[] not null default '{}',
  detalle_json        jsonb,
  orden               int not null default 0
);
create index pedido_items_pedido_idx on public.pedido_items (pedido_id, orden);

create table public.cupon_usos (
  id         uuid primary key default gen_random_uuid(),
  promo_id   uuid not null references public.promos (id) on delete cascade,
  pedido_id  uuid references public.pedidos (id) on delete cascade,
  telefono   text,
  creado_en  timestamptz not null default now()
);
create index cupon_usos_promo_idx on public.cupon_usos (promo_id);

-- ---------------------------------------------------------------------
-- Encuestas post-venta
-- ---------------------------------------------------------------------

create table public.encuestas (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos (id) on delete cascade,
  token          text not null unique,
  creado_en      timestamptz not null default now(),
  respondida_en  timestamptz
);
create index encuestas_pedido_idx on public.encuestas (pedido_id);

create table public.respuestas (
  id               uuid primary key default gen_random_uuid(),
  encuesta_id      uuid not null unique references public.encuestas (id) on delete cascade,
  estrellas        int not null check (estrellas between 1 and 5),
  origen           text not null default '',
  mejorar          text not null default '',
  comentario       text not null default '',
  invitado_google  boolean not null default false,
  creado_en        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Triggers de pedidos
-- ---------------------------------------------------------------------

-- Marcas de tiempo: actualizado_en, confirmado_en (al pasar a cocina) y entregado_en.
create or replace function public.pedidos_marcas_tiempo()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado not in ('nuevo', 'sin_respuesta', 'cancelado') and new.confirmado_en is null then
      new.confirmado_en := new.creado_en;
    end if;
    if new.estado = 'entregado' and new.entregado_en is null then
      new.entregado_en := now();
    end if;
    return new;
  end if;

  new.actualizado_en := now();
  if old.estado in ('nuevo', 'sin_respuesta')
     and new.estado not in ('nuevo', 'sin_respuesta', 'cancelado')
     and new.confirmado_en is null then
    new.confirmado_en := now();
  end if;
  if new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    new.entregado_en := now();
  end if;
  return new;
end;
$$;

-- Crea o reutiliza el cliente por teléfono al registrar un pedido.
create or replace function public.pedidos_vincular_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  new.telefono := public.normalizar_telefono(new.telefono);
  if new.telefono is null or new.cliente_id is not null then
    return new;
  end if;

  insert into public.clientes (nombre, telefono, origen)
  values (coalesce(nullif(btrim(new.cliente_nombre), ''), 'Cliente'),
          new.telefono,
          case new.canal when 'web' then 'Web' else 'Caja' end)
  on conflict (telefono) do update
    set nombre = case when public.clientes.nombre = '' or public.clientes.nombre = 'Cliente'
                      then excluded.nombre else public.clientes.nombre end
  returning id into v_id;

  new.cliente_id := v_id;
  return new;
end;
$$;

create or replace function public.clientes_normalizar()
returns trigger
language plpgsql
as $$
begin
  new.telefono := public.normalizar_telefono(new.telefono);
  return new;
end;
$$;

create trigger clientes_normalizar
  before insert or update of telefono on public.clientes
  for each row execute function public.clientes_normalizar();

-- Los BEFORE triggers se ejecutan en orden alfabético: el prefijo numérico fija el orden.
create trigger pedidos_20_vincular_cliente
  before insert on public.pedidos
  for each row execute function public.pedidos_vincular_cliente();

create trigger pedidos_30_marcas_tiempo
  before insert or update on public.pedidos
  for each row execute function public.pedidos_marcas_tiempo();

-- ---------------------------------------------------------------------
-- Vistas para el panel
-- ---------------------------------------------------------------------

-- Resumen por cliente (no cuenta pedidos cancelados ni sin respuesta).
create view public.clientes_resumen
with (security_invoker = true)
as
select
  c.id,
  c.nombre,
  c.telefono,
  c.origen,
  c.creado_en,
  count(p.id)::int                          as pedidos,
  coalesce(sum(p.total), 0)::numeric(10,2)  as gastado,
  max(p.creado_en)                          as ultimo_pedido,
  coalesce((
    select coalesce(s.nombre, x.salsa)
    from public.pedidos p2
    join public.pedido_items i on i.pedido_id = p2.id
    cross join lateral unnest(i.salsas) as x(salsa)
    left join public.salsas s on s.id = x.salsa
    where p2.cliente_id = c.id
      and p2.estado not in ('cancelado', 'sin_respuesta')
    group by x.salsa, s.nombre
    order by sum(i.cantidad) desc, x.salsa
    limit 1
  ), '')                                    as salsa_favorita
from public.clientes c
left join public.pedidos p
  on p.cliente_id = c.id
 and p.estado not in ('cancelado', 'sin_respuesta')
group by c.id;

-- Reseñas de la encuesta post-venta.
create view public.resenas
with (security_invoker = true)
as
select
  r.id,
  p.cliente_nombre                    as nombre,
  coalesce(p.telefono, '')            as telefono,
  p.codigo                            as pedido,
  r.creado_en                         as fecha,
  r.estrellas,
  r.comentario                        as texto,
  r.origen,
  r.mejorar                           as tema,
  r.invitado_google
from public.respuestas r
join public.encuestas e on e.id = r.encuesta_id
join public.pedidos p   on p.id = e.pedido_id;
