-- =====================================================================
-- Ala Mi Bro · Roles, reglas de estado y Row Level Security
--   admin  → todo
--   caja   → pedidos, caja y clientes (lee la carta, ajustes, zonas y promos)
--   cocina → solo pedidos: ver y cambiar el estado
--   anon   → solo lectura de la carta pública. Los pedidos web entran
--            únicamente por la Edge Function crear-pedido (service role).
-- =====================================================================

-- Rol del usuario autenticado (null para anon o usuarios sin perfil).
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Transiciones de estado permitidas
-- ---------------------------------------------------------------------
--   nuevo         → cocina | sin_respuesta | cancelado          (admin, caja)
--   sin_respuesta → cocina | cancelado                          (admin, caja)
--   cocina        → listo                                       (admin, caja, cocina)
--   listo         → camino (solo delivery) | entregado (no delivery)  (todos)
--   camino        → entregado                                   (todos)
--   cualquier estado no final → cancelado                       (admin, caja)
--   entregado y cancelado son finales.
-- p_rol null = proceso del sistema (service role / tarea programada): sin restricción de rol.
create or replace function public.transicion_permitida(
  p_de text, p_a text, p_modalidad text, p_rol text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_de = p_a then false
    when p_de in ('entregado', 'cancelado') then false
    when p_a = 'cancelado' then coalesce(p_rol in ('admin', 'caja'), true)
    when p_de in ('nuevo', 'sin_respuesta') and p_a = 'cocina' then coalesce(p_rol in ('admin', 'caja'), true)
    when p_de = 'nuevo' and p_a = 'sin_respuesta' then coalesce(p_rol in ('admin', 'caja'), true)
    when p_de = 'cocina' and p_a = 'listo' then true
    when p_de = 'listo' and p_a = 'camino' then p_modalidad = 'delivery'
    when p_de = 'listo' and p_a = 'entregado' then p_modalidad <> 'delivery'
    when p_de = 'camino' and p_a = 'entregado' then true
    else false
  end;
$$;

-- Cocina solo puede cambiar el estado. También valida las transiciones de cualquier usuario del panel.
create or replace function public.pedidos_guardia()
returns trigger
language plpgsql
as $$
declare
  v_rol text := public.rol_actual();
  v_libres text[] := array['estado', 'actualizado_en', 'confirmado_en', 'entregado_en', 'stock_descontado'];
begin
  if v_rol = 'cocina'
     and (to_jsonb(new) - v_libres) is distinct from (to_jsonb(old) - v_libres) then
    raise exception 'Cocina solo puede cambiar el estado del pedido'
      using errcode = '42501';
  end if;

  if new.estado is distinct from old.estado
     and v_rol is not null
     and not public.transicion_permitida(old.estado, new.estado, new.modalidad, v_rol) then
    raise exception 'No se puede pasar el pedido de "%" a "%"', old.estado, new.estado
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger pedidos_10_guardia
  before update on public.pedidos
  for each row execute function public.pedidos_guardia();

-- Descuenta el stock al confirmar un pedido web (pasa a cocina) y lo repone al cancelar.
create or replace function public.pedidos_mover_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'cocina' and old.estado is distinct from 'cocina' and not new.stock_descontado then
    update public.productos pr
       set stock = greatest(pr.stock - t.n, 0)
      from (select producto_id, sum(cantidad)::int as n
              from public.pedido_items
             where pedido_id = new.id and producto_id is not null
             group by producto_id) t
     where pr.id = t.producto_id;
    new.stock_descontado := true;
  elsif new.estado = 'cancelado' and old.stock_descontado then
    update public.productos pr
       set stock = pr.stock + t.n
      from (select producto_id, sum(cantidad)::int as n
              from public.pedido_items
             where pedido_id = new.id and producto_id is not null
             group by producto_id) t
     where pr.id = t.producto_id;
    new.stock_descontado := false;
  end if;
  return new;
end;
$$;

create trigger pedidos_40_mover_stock
  before update of estado on public.pedidos
  for each row execute function public.pedidos_mover_stock();

-- ---------------------------------------------------------------------
-- Permisos base (las políticas RLS deciden fila por fila)
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on
  public.categorias, public.productos, public.presentaciones, public.grupos_opciones,
  public.opciones, public.salsas, public.zonas_delivery, public.ajustes_tienda, public.promos
to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on sequence public.pedidos_codigo_seq to authenticated, service_role;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant execute on function public.rol_actual() to anon, authenticated, service_role;
grant execute on function public.transicion_permitida(text, text, text, text) to authenticated, service_role;
grant execute on function public.normalizar_telefono(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.categorias       enable row level security;
alter table public.productos        enable row level security;
alter table public.presentaciones   enable row level security;
alter table public.grupos_opciones  enable row level security;
alter table public.opciones         enable row level security;
alter table public.salsas           enable row level security;
alter table public.agregados        enable row level security;
alter table public.zonas_delivery   enable row level security;
alter table public.ajustes_tienda   enable row level security;
alter table public.perfiles         enable row level security;
alter table public.clientes         enable row level security;
alter table public.promos           enable row level security;
alter table public.cupon_usos       enable row level security;
alter table public.pedidos          enable row level security;
alter table public.pedido_items     enable row level security;
alter table public.encuestas        enable row level security;
alter table public.respuestas       enable row level security;

-- Carta pública: lectura para todos, escritura solo admin.
do $$
declare
  t text;
begin
  foreach t in array array['categorias', 'productos', 'presentaciones', 'grupos_opciones',
                           'opciones', 'salsas', 'zonas_delivery', 'ajustes_tienda']
  loop
    execute format(
      'create policy "%1$s: lectura pública" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "%1$s: admin gestiona" on public.%1$I for all to authenticated
         using ((select public.rol_actual()) = ''admin'')
         with check ((select public.rol_actual()) = ''admin'')', t);
  end loop;
end;
$$;

-- Agregados: lectura del equipo, escritura admin.
create policy "agregados: lectura equipo" on public.agregados
  for select to authenticated using ((select public.rol_actual()) is not null);
create policy "agregados: admin gestiona" on public.agregados
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');

-- Promos: el público solo ve promos activas SIN cupón (los cupones nunca se listan).
create policy "promos: públicas activas" on public.promos
  for select to anon, authenticated using (activa and codigo_cupon is null);
create policy "promos: lectura caja" on public.promos
  for select to authenticated using ((select public.rol_actual()) in ('admin', 'caja'));
create policy "promos: admin gestiona" on public.promos
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');

create policy "cupon_usos: lectura caja" on public.cupon_usos
  for select to authenticated using ((select public.rol_actual()) in ('admin', 'caja'));
create policy "cupon_usos: admin gestiona" on public.cupon_usos
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');

-- Perfiles: cada uno ve el suyo; admin gestiona todos.
create policy "perfiles: propio" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfiles: admin gestiona" on public.perfiles
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');

-- Clientes: admin y caja.
create policy "clientes: admin" on public.clientes
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');
create policy "clientes: caja lee" on public.clientes
  for select to authenticated using ((select public.rol_actual()) = 'caja');
create policy "clientes: caja crea" on public.clientes
  for insert to authenticated with check ((select public.rol_actual()) = 'caja');
create policy "clientes: caja edita" on public.clientes
  for update to authenticated
  using ((select public.rol_actual()) = 'caja')
  with check ((select public.rol_actual()) = 'caja');

-- Pedidos: admin todo; caja ve/crea/edita; cocina ve y cambia estado (trigger pedidos_10_guardia).
create policy "pedidos: admin" on public.pedidos
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');
create policy "pedidos: equipo lee" on public.pedidos
  for select to authenticated using ((select public.rol_actual()) in ('caja', 'cocina'));
create policy "pedidos: caja crea" on public.pedidos
  for insert to authenticated with check ((select public.rol_actual()) = 'caja');
create policy "pedidos: caja y cocina editan" on public.pedidos
  for update to authenticated
  using ((select public.rol_actual()) in ('caja', 'cocina'))
  with check ((select public.rol_actual()) in ('caja', 'cocina'));

create policy "pedido_items: admin" on public.pedido_items
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');
create policy "pedido_items: equipo lee" on public.pedido_items
  for select to authenticated using ((select public.rol_actual()) in ('caja', 'cocina'));
create policy "pedido_items: caja crea" on public.pedido_items
  for insert to authenticated with check ((select public.rol_actual()) = 'caja');
create policy "pedido_items: caja edita" on public.pedido_items
  for update to authenticated
  using ((select public.rol_actual()) = 'caja')
  with check ((select public.rol_actual()) = 'caja');

-- Encuestas y respuestas: solo admin desde el panel (el público usa la Edge Function encuesta).
create policy "encuestas: admin" on public.encuestas
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');
create policy "respuestas: admin" on public.respuestas
  for all to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');
